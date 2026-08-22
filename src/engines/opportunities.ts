import type { AmenityStat, AmenityClassification, Opportunity, Difficulty } from "./types";

/**
 * Opportunity engine: detect amenity gaps (docs/06). Core rule — an amenity that
 * is a data-classified *delight* and prevalent+praised in some markets, but rare
 * in another market that shows demand for it, is an opportunity in that market.
 * Every opportunity carries the demand evidence; ones below the sample floor are
 * not emitted (docs/11 — no thin-evidence claims).
 */

export interface OpportunityOptions {
  minDemandReviews?: number; // supporting reviews required to surface a gap
  lowPrevalenceThreshold?: number; // "rare in this market" cutoff
  costHints?: Record<string, { costUsd?: number; difficulty?: Difficulty }>;
}

export function detectAmenityOpportunities(
  stats: AmenityStat[],
  classifications: AmenityClassification[],
  options: OpportunityOptions = {},
): Opportunity[] {
  const minDemand = options.minDemandReviews ?? 5;
  const lowPrevalence = options.lowPrevalenceThreshold ?? 0.1;
  const costHints = options.costHints ?? {};
  const classBySlug = new Map(classifications.map((c) => [c.amenitySlug, c]));

  // Group amenity stats by slug, and compute a "supply" prevalence per market.
  const bySlug = new Map<string, AmenityStat[]>();
  for (const s of stats) {
    const arr = bySlug.get(s.amenitySlug) ?? [];
    arr.push(s);
    bySlug.set(s.amenitySlug, arr);
  }

  const opportunities: Opportunity[] = [];
  for (const [slug, group] of bySlug) {
    const cls = classBySlug.get(slug);
    // Only chase amenities the data says are delighters.
    if (!cls || cls.classification !== "delight") continue;

    for (const marketStat of group) {
      const prevalence =
        marketStat.reviewsInPeriod > 0 ? marketStat.mentions / marketStat.reviewsInPeriod : 0;
      // Demand signal in this market = guests asking for it (negative/absence mentions).
      const demand = marketStat.negative;
      if (prevalence >= lowPrevalence) continue; // already well-supplied here
      if (demand < minDemand) continue; // not enough evidence of demand

      const hint = costHints[slug] ?? {};
      const positiveRateElsewhere = cls.signals.positiveRate;
      // Expected review impact: demand strength × how loved it is elsewhere.
      const expectedReviewImpact = round(Math.min(0.3, (demand / 40) * positiveRateElsewhere));

      opportunities.push({
        marketId: marketStat.marketId,
        gapType: "amenity",
        title: `Add ${humanize(slug)} to address unmet demand`,
        description: `${humanize(slug)} is a data-classified delighter that ${marketStat.mentions} reviews here reference, ${demand} of them wishing for it, yet it is rare in this market.`,
        amenitySlug: slug,
        estimatedCostUsd: hint.costUsd,
        difficulty: hint.difficulty ?? "moderate",
        expectedReviewImpact,
        confidence: round(Math.min(cls.confidence, Math.min(1, demand / (minDemand * 3)))),
        supportingReviewCount: demand,
        evidence: marketStat.evidence.slice(0, 5),
      });
    }
  }
  return opportunities;
}

function humanize(slug: string): string {
  return slug.replace(/_/g, " ");
}
function round(n: number): number {
  return Math.round(n * 1e3) / 1e3;
}
