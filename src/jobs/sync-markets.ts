/**
 * markets:sync — upsert the markets defined in config/markets.yaml into the
 * `markets` table. Adding a market is a config edit; this job reconciles config
 * into the database. Idempotent.
 *
 * Usage: npm run markets:sync
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import { loadMarkets } from "../lib/config/load";
import { MARKETS_CONFIG } from "../lib/config/paths";
import { createServiceClient } from "../lib/db/client";
import { SupabaseRepository } from "../lib/db/supabase-repository";
import { logger } from "../lib/logging";

async function main(): Promise<void> {
  const config = loadMarkets(MARKETS_CONFIG());
  const repo = new SupabaseRepository(createServiceClient());

  let count = 0;
  for (const market of config.markets) {
    const id = await repo.upsertMarketFromConfig({
      slug: market.slug,
      name: market.name,
      region: config.defaults.region,
      centerLat: market.center?.lat,
      centerLng: market.center?.lng,
      searchTerms: market.search_terms,
    });
    logger.info({ slug: market.slug, id }, "market synced");
    count += 1;
  }
  logger.info({ count }, "markets sync complete");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "markets sync failed");
  process.exitCode = 1;
});
