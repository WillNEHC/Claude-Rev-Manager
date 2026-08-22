import type { AmenityStat, CategoryStat, MarketInsight, EvidenceItem } from "./types";

/**
 * Market Comparison (docs/06): synthesize a per-market profile — its most-praised
 * amenity and its dominant complaint category — as evidence-backed insights the
 * dashboard and report contrast across the four lakes.
 */
export function compareMarkets(
  amenityStats: AmenityStat[],
  categoryStats: CategoryStat[],
): MarketInsight[] {
  const markets = new Set<string>([
    ...amenityStats.map((s) => s.marketId),
    ...categoryStats.map((s) => s.marketId),
  ]);

  const insights: MarketInsight[] = [];
  for (const marketId of markets) {
    const topAmenity = amenityStats
      .filter((s) => s.marketId === marketId && s.positive > 0)
      .sort((a, b) => b.positive - a.positive)[0];
    const topComplaint = categoryStats
      .filter((s) => s.marketId === marketId && s.negative > 0)
      .sort((a, b) => b.negative - a.negative)[0];

    if (!topAmenity && !topComplaint) continue;

    const evidence: EvidenceItem[] = [
      ...(topAmenity?.evidence.slice(0, 3) ?? []),
      ...(topComplaint?.evidence.slice(0, 2) ?? []),
    ];
    const supportingReviewCount = (topAmenity?.positive ?? 0) + (topComplaint?.negative ?? 0);

    const parts: string[] = [];
    if (topAmenity) parts.push(`Most-praised amenity: ${humanize(topAmenity.amenitySlug)} (${topAmenity.positive} positive mentions).`);
    if (topComplaint) parts.push(`Top complaint area: ${humanize(topComplaint.categorySlug)} (${topComplaint.negative} negative mentions).`);

    insights.push({
      marketId,
      insightType: "market_profile",
      title: "Market profile: strengths and pain points",
      summary: parts.join(" "),
      confidence: Math.min(1, supportingReviewCount / 20),
      supportingReviewCount,
      evidence,
    });
  }
  return insights;
}

function humanize(slug: string): string {
  return slug.replace(/_/g, " ");
}
