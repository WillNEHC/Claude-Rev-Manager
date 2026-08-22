/**
 * enrich — attach revenue context (occupancy, ADR) to market-level monthly
 * snapshots via PriceLabs. Optional; skips markets with no geo mapping.
 *
 * Usage: npm run enrich -- [YYYY-MM-01]
 * Requires SUPABASE_*; PRICELABS_API_KEY (else no-op).
 */
import { createServiceClient } from "../lib/db/client";
import { SupabaseEnrichmentRepository } from "../lib/db/supabase-enrichment-repository";
import { PriceLabsProvider } from "../enrichment/revenue";
import { runEnrichment } from "../enrichment/enrich";
import { logger } from "../lib/logging";

// Map each market to its PriceLabs geo identifier (zip). Config-driven in practice.
const MARKET_GEO: Record<string, string> = {
  "lake-winnipesaukee": "03246",
  "squam-lake": "03245",
  "newfound-lake": "03222",
  "lake-sunapee": "03782",
};

function firstOfThisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function main(): Promise<void> {
  const apiKey = process.env.PRICELABS_API_KEY;
  if (!apiKey) {
    logger.warn("PRICELABS_API_KEY not set — skipping revenue enrichment");
    return;
  }
  const snapshotMonth = process.argv[2] || firstOfThisMonth();
  const repo = new SupabaseEnrichmentRepository(createServiceClient());
  const provider = new PriceLabsProvider({ apiKey, geoForMarket: (slug) => MARKET_GEO[slug] });
  const result = await runEnrichment({ repo, provider, snapshotMonth, logger });
  logger.info(result, "enrich job finished");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "enrich failed");
  process.exitCode = 1;
});
