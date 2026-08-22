/**
 * research — ToS-clean ingestion. Gathers PUBLIC web content (blogs, Reddit,
 * forums, destination sites, Google) as market-level review evidence, instead of
 * scraping competitor listings. This is the recommended default intake (docs/16).
 *
 * Usage: npm run research -- [market-slug]   (all markets if omitted)
 * Requires SUPABASE_*, FIRECRAWL_API_KEY.
 */
import { loadMarkets } from "../lib/config/load";
import { MARKETS_CONFIG } from "../lib/config/paths";
import { createServiceClient } from "../lib/db/client";
import { SupabaseRepository } from "../lib/db/supabase-repository";
import { FirecrawlClient } from "../lib/firecrawl/client";
import { FirecrawlResearchProvider } from "../ingestion/research/provider";
import { runWebResearch } from "../ingestion/research/pipeline";
import { logger } from "../lib/logging";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const marketsFile = loadMarkets(MARKETS_CONFIG());
  const markets = only ? marketsFile.markets.filter((m) => m.slug === only) : marketsFile.markets;
  if (markets.length === 0) throw new Error(`No matching market for '${only ?? "(all)"}'`);

  const repo = new SupabaseRepository(createServiceClient());
  const fc = new FirecrawlClient({ apiKey: requireEnv("FIRECRAWL_API_KEY"), logger });
  const provider = new FirecrawlResearchProvider(fc);

  for (const market of markets) {
    const marketId = await repo.getMarketIdBySlug(market.slug);
    if (!marketId) {
      logger.warn({ market: market.slug }, "market not in DB — run markets:sync first; skipping");
      continue;
    }
    const result = await runWebResearch({ marketId, market, provider, repo, logger });
    logger.info({ market: market.slug, ...result }, "research finished");
  }
}

main().catch((err) => {
  logger.error({ err: String(err) }, "research failed");
  process.exitCode = 1;
});
