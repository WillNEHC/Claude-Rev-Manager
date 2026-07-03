/**
 * backfill — one-time historical load. Ingests every market × configured source,
 * then drains the extraction and embedding queues in bounded batches (budget
 * ceilings from env, per docs/12). Safe to re-run; everything is idempotent.
 *
 * Usage: npm run backfill -- [market-slug]     (all markets if omitted)
 * Requires SUPABASE_*, FIRECRAWL_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY.
 */
import { loadMarkets, loadDiscoveryFilters, resolveProfile } from "../lib/config/load";
import { MARKETS_CONFIG, DISCOVERY_CONFIG } from "../lib/config/paths";
import { createServiceClient } from "../lib/db/client";
import { SupabaseRepository } from "../lib/db/supabase-repository";
import { SupabaseExtractionRepository } from "../lib/db/supabase-extraction-repository";
import { FirecrawlClient } from "../lib/firecrawl/client";
import { AirbnbAdapter } from "../ingestion/adapters/airbnb";
import { VrboAdapter } from "../ingestion/adapters/vrbo";
import { BookingAdapter } from "../ingestion/adapters/booking";
import { runIngestion } from "../ingestion/pipeline";
import { drainQueue } from "../ingestion/backfill";
import { runExtraction } from "../ai/pipeline";
import { runEmbedding } from "../ai/pipeline";
import { AnthropicExtractor } from "../ai/extract";
import { OpenAIEmbeddingProvider } from "../ai/embed";
import type { SourceAdapter } from "../ingestion/types";
import type { PlatformSource } from "../lib/config/schema";
import { logger } from "../lib/logging";

function adapterFor(source: PlatformSource, fc: FirecrawlClient): SourceAdapter | null {
  switch (source) {
    case "airbnb": return new AirbnbAdapter(fc);
    case "vrbo": return new VrboAdapter(fc);
    case "booking": return new BookingAdapter(fc);
    default: return null; // review-only sources (reddit, forums) — future path
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const marketsFile = loadMarkets(MARKETS_CONFIG());
  const filters = loadDiscoveryFilters(DISCOVERY_CONFIG());
  const profile = resolveProfile(filters, marketsFile.defaults.discovery_filters_ref);
  const markets = only ? marketsFile.markets.filter((m) => m.slug === only) : marketsFile.markets;

  const db = createServiceClient();
  const ingestRepo = new SupabaseRepository(db);
  const fc = new FirecrawlClient({ apiKey: requireEnv("FIRECRAWL_API_KEY"), logger });

  // 1. Ingest each market × source.
  for (const market of markets) {
    const marketId = await ingestRepo.getMarketIdBySlug(market.slug);
    if (!marketId) {
      logger.warn({ market: market.slug }, "market not in DB — run markets:sync; skipping");
      continue;
    }
    for (const source of marketsFile.defaults.sources) {
      const adapter = adapterFor(source, fc);
      if (!adapter) continue;
      const res = await runIngestion({
        marketId,
        market,
        adapter,
        repo: ingestRepo,
        profile,
        historyWindowMonths: marketsFile.defaults.history_window_months,
        logger,
      });
      logger.info({ market: market.slug, source, ...res }, "backfill ingest");
    }
  }

  // 2. Drain extraction, then embedding (budget-capped).
  const extractRepo = new SupabaseExtractionRepository(db);
  const extractor = new AnthropicExtractor({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  const embedder = new OpenAIEmbeddingProvider({ apiKey: requireEnv("OPENAI_API_KEY") });
  const maxReviews = Number(process.env.GDIP_BACKFILL_MAX_REVIEWS ?? 100000);

  const ex = await drainQueue(
    async (limit) => {
      const r = await runExtraction({ repo: extractRepo, extractor, limit, logger });
      return { done: r.processed + r.failed };
    },
    { batchSize: 200, maxItems: maxReviews },
  );
  logger.info(ex, "backfill extraction drained");

  const em = await drainQueue(
    async (limit) => {
      const r = await runEmbedding({ repo: extractRepo, embedder, limit, logger });
      return { done: r.embedded };
    },
    { batchSize: 200, maxItems: maxReviews },
  );
  logger.info(em, "backfill embedding drained");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "backfill failed");
  process.exitCode = 1;
});
