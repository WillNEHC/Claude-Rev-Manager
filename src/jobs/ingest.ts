/**
 * ingest — run ingestion for one market + source (default airbnb) into Supabase.
 *
 * Usage: npm run ingest -- <market-slug> [source]
 *   e.g. npm run ingest -- squam-lake airbnb
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY.
 * The market must already exist (run markets:sync first).
 */
import { loadMarkets, loadDiscoveryFilters, resolveProfile } from "../lib/config/load";
import { MARKETS_CONFIG, DISCOVERY_CONFIG } from "../lib/config/paths";
import { createServiceClient } from "../lib/db/client";
import { SupabaseRepository } from "../lib/db/supabase-repository";
import { FirecrawlClient } from "../lib/firecrawl/client";
import { AirbnbAdapter } from "../ingestion/adapters/airbnb";
import { VrboAdapter } from "../ingestion/adapters/vrbo";
import { BookingAdapter } from "../ingestion/adapters/booking";
import { runIngestion } from "../ingestion/pipeline";
import type { SourceAdapter } from "../ingestion/types";
import type { PlatformSource } from "../lib/config/schema";
import { logger } from "../lib/logging";

function buildAdapter(source: PlatformSource, fc: FirecrawlClient): SourceAdapter {
  switch (source) {
    case "airbnb":
      return new AirbnbAdapter(fc);
    case "vrbo":
      return new VrboAdapter(fc);
    case "booking":
      return new BookingAdapter(fc);
    default:
      throw new Error(`No adapter implemented for source '${source}' yet`);
  }
}

async function main(): Promise<void> {
  const slug = process.argv[2];
  const source = (process.argv[3] ?? "airbnb") as PlatformSource;
  if (!slug) {
    throw new Error("Usage: npm run ingest -- <market-slug> [source]");
  }

  const marketsFile = loadMarkets(MARKETS_CONFIG());
  const market = marketsFile.markets.find((m) => m.slug === slug);
  if (!market) throw new Error(`Market '${slug}' not found in config`);

  const filters = loadDiscoveryFilters(DISCOVERY_CONFIG());
  const profile = resolveProfile(filters, marketsFile.defaults.discovery_filters_ref);

  const repo = new SupabaseRepository(createServiceClient());
  const marketId = await repo.getMarketIdBySlug(slug);
  if (!marketId) throw new Error(`Market '${slug}' not in database — run markets:sync first`);

  const fc = new FirecrawlClient({
    apiKey: requireEnv("FIRECRAWL_API_KEY"),
    logger,
  });
  const adapter = buildAdapter(source, fc);

  const result = await runIngestion({
    marketId,
    market,
    adapter,
    repo,
    profile,
    historyWindowMonths: marketsFile.defaults.history_window_months,
    logger,
  });
  logger.info(result, "ingestion finished");
  if (result.status === "failed") process.exitCode = 1;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

main().catch((err) => {
  logger.error({ err: String(err) }, "ingest failed");
  process.exitCode = 1;
});
