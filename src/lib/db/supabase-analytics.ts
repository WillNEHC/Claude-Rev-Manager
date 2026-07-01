import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsSource } from "../../engines/analytics";
import type { PeriodMetric, AmenityStat, CategoryStat, EvidenceItem } from "../../engines/types";
import { previousMonth } from "../../engines/pipeline";

/**
 * Supabase analytics source: calls the SQL aggregation functions (migration
 * 0007) and derives trend period-metrics in the app layer. Returns the same
 * shapes the in-memory source does, so the engines are unchanged.
 */
export class SupabaseAnalyticsSource implements AnalyticsSource {
  constructor(private readonly db: SupabaseClient) {}

  async getAmenityStats(periodStart: string): Promise<AmenityStat[]> {
    const { data, error } = await this.db.rpc("amenity_stats", { p_month: periodStart });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      marketId: r.market_id as string,
      amenitySlug: r.amenity_slug as string,
      amenityId: r.amenity_id as string,
      reviewsInPeriod: Number(r.reviews_in_period),
      mentions: Number(r.mentions),
      positive: Number(r.positive),
      negative: Number(r.negative),
      delighterCooccur: Number(r.delighter_cooccur),
      evidence: toEvidence(r.evidence),
    }));
  }

  async getCategoryStats(periodStart: string): Promise<CategoryStat[]> {
    const { data, error } = await this.db.rpc("category_stats", { p_month: periodStart });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      marketId: r.market_id as string,
      categorySlug: r.category_slug as string,
      categoryId: r.category_id as string,
      mentions: Number(r.mentions),
      positive: Number(r.positive),
      negative: Number(r.negative),
      evidence: toEvidence(r.evidence),
    }));
  }

  async getPeriodMetrics(periodStart: string): Promise<PeriodMetric[]> {
    return this.deriveMetrics(periodStart);
  }

  async getPreviousPeriodMetrics(periodStart: string): Promise<PeriodMetric[]> {
    return this.deriveMetrics(previousMonth(periodStart));
  }

  /** Derive trend metrics from the amenity + category aggregates. */
  private async deriveMetrics(month: string): Promise<PeriodMetric[]> {
    const [amenities, categories] = await Promise.all([
      this.getAmenityStats(month),
      this.getCategoryStats(month),
    ]);
    const metrics: PeriodMetric[] = [];
    for (const a of amenities) {
      metrics.push({
        metricKey: `amenity.${a.amenitySlug}.mention_rate`,
        entityType: "amenity",
        entityId: a.amenityId,
        marketId: a.marketId,
        periodStart: month,
        value: a.reviewsInPeriod > 0 ? a.mentions / a.reviewsInPeriod : 0,
        sampleSize: a.mentions,
      });
    }
    for (const c of categories) {
      metrics.push({
        metricKey: `category.${c.categorySlug}.negative_rate`,
        entityType: "category",
        entityId: c.categoryId,
        marketId: c.marketId,
        periodStart: month,
        value: c.mentions > 0 ? c.negative / c.mentions : 0,
        sampleSize: c.mentions,
      });
    }
    return metrics;
  }
}

function toEvidence(raw: unknown): EvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((e): e is string => typeof e === "string")
    .map((excerpt) => ({ excerpt }));
}
