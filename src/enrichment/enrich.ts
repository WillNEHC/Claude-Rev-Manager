import type { RevenueEnrichmentProvider } from "./revenue";
import { toSnapshotMetrics } from "./revenue";
import type { Logger } from "../lib/logging";
import { logger as rootLogger } from "../lib/logging";

/**
 * Enrichment run: for each market, fetch revenue context and write a
 * market-level monthly snapshot (listing_id null). Idempotent per
 * (month, market). Failures for one market degrade that market, not the run.
 */

export interface EnrichmentRepository {
  getMarkets(): Promise<{ id: string; slug: string }[]>;
  upsertMarketSnapshot(input: {
    marketId: string;
    snapshotMonth: string;
    occupancyPct?: number;
    metrics: Record<string, unknown>;
  }): Promise<void>;
}

export interface RunEnrichmentInput {
  repo: EnrichmentRepository;
  provider: RevenueEnrichmentProvider;
  snapshotMonth: string;
  logger?: Logger;
}

export interface RunEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
}

export async function runEnrichment(input: RunEnrichmentInput): Promise<RunEnrichmentResult> {
  const log = (input.logger ?? rootLogger).child({ job: "enrich", source: input.provider.source });
  const markets = await input.repo.getMarkets();
  const result: RunEnrichmentResult = { enriched: 0, skipped: 0, failed: 0 };

  for (const market of markets) {
    try {
      const enrichment = await input.provider.forMarket({ marketSlug: market.slug });
      if (!enrichment) {
        result.skipped += 1;
        continue;
      }
      const { occupancyPct, metrics } = toSnapshotMetrics(enrichment);
      await input.repo.upsertMarketSnapshot({
        marketId: market.id,
        snapshotMonth: input.snapshotMonth,
        occupancyPct,
        metrics,
      });
      result.enriched += 1;
    } catch (err) {
      result.failed += 1;
      log.warn({ market: market.slug, err: String(err) }, "enrichment failed for market");
    }
  }
  log.info(result, "enrichment complete");
  return result;
}
