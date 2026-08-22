import type { Opportunity, Recommendation, TrendPoint, RoiClass, ChangeType } from "./types";
import { priorityScore, type ScoringWeights, DEFAULT_WEIGHTS } from "./scoring";

/**
 * Recommendation engine (docs/06, docs/14): promote opportunities into the
 * monthly deliverable — ranked, fully specified, evidence-carrying, and diffed
 * against last month for continuity (new / persisted / strengthened / weakened /
 * retired). Evidence is carried from the opportunity; a recommendation cannot
 * exist without it.
 */

export interface BuildRecommendationsInput {
  opportunities: Opportunity[];
  trends: Map<string, TrendPoint>; // keyed `${marketId}:${metricKey}`
  priorRecommendations: Recommendation[]; // last month's, for the diff
  reportMonth: string; // YYYY-MM-01
  weights?: ScoringWeights;
}

export function buildRecommendations(input: BuildRecommendationsInput): Recommendation[] {
  const weights = input.weights ?? DEFAULT_WEIGHTS;
  const priorByKey = new Map(input.priorRecommendations.map((r) => [r.key, r]));

  const maxRevenue = Math.max(1, ...input.opportunities.map((o) => o.expectedRevenueImpactUsd ?? 0));
  const maxCost = Math.max(1, ...input.opportunities.map((o) => o.estimatedCostUsd ?? 0));

  const recs: Recommendation[] = [];
  const seenKeys = new Set<string>();

  for (const opp of input.opportunities) {
    const key = `${opp.marketId}:${opp.gapType}:${opp.amenitySlug ?? slugifyTitle(opp.title)}`;
    seenKeys.add(key);

    const trend = opp.amenitySlug
      ? input.trends.get(`${opp.marketId}:amenity.${opp.amenitySlug}.mention_rate`)
      : undefined;
    const momentum = trend && trend.direction === "up" ? Math.min(1, Math.abs(trend.deltaPct ?? 0)) : 0;
    const guestImpactNorm = Math.min(1, (opp.expectedReviewImpact ?? 0) / 0.3);

    const score = priorityScore(
      {
        confidence: opp.confidence,
        expectedGuestImpact: guestImpactNorm,
        expectedRevenueImpactUsd: opp.expectedRevenueImpactUsd,
        difficulty: opp.difficulty,
        estimatedCostUsd: opp.estimatedCostUsd,
        trendMomentum: momentum,
      },
      { maxRevenueUsd: maxRevenue, maxCostUsd: maxCost, weights },
    );

    const prior = priorByKey.get(key);
    const changeType: ChangeType = !prior
      ? "new"
      : score > prior.priorityScore + 0.02
        ? "strengthened"
        : score < prior.priorityScore - 0.02
          ? "weakened"
          : "persisted";

    recs.push({
      key,
      marketId: opp.marketId,
      reportMonth: input.reportMonth,
      title: opp.title,
      ownerExplanation: buildOwnerExplanation(opp),
      operatorExplanation: buildOperatorExplanation(opp),
      supportingReviewCount: opp.supportingReviewCount,
      confidence: opp.confidence,
      implementationCostUsd: opp.estimatedCostUsd,
      roiClass: roiFrom(opp),
      difficulty: opp.difficulty,
      expectedGuestImpact:
        opp.expectedReviewImpact != null
          ? `+${opp.expectedReviewImpact.toFixed(2)} modeled rating impact`
          : "positive (unquantified)",
      expectedRevenueImpactUsd: opp.expectedRevenueImpactUsd,
      priorityScore: score,
      lastObservedTrend: trend ? `${trend.direction} (${fmtPct(trend.deltaPct)})` : undefined,
      changeType,
      evidence: opp.evidence,
    });
  }

  // Retired: last month's recommendations whose opportunity no longer appears.
  for (const prior of input.priorRecommendations) {
    if (!seenKeys.has(prior.key)) {
      recs.push({
        ...prior,
        reportMonth: input.reportMonth,
        priorityScore: 0,
        changeType: "retired",
        lastObservedTrend: "signal no longer present",
      });
    }
  }

  return recs.sort((a, b) => b.priorityScore - a.priorityScore);
}

function roiFrom(opp: Opportunity): RoiClass {
  const impact = opp.expectedReviewImpact ?? 0;
  const cost = opp.estimatedCostUsd;
  if (opp.supportingReviewCount < 5 || opp.confidence < 0.4) return "unproven";
  if (impact >= 0.15 && (cost === undefined || cost <= 1500)) return "exceptional";
  if (impact >= 0.1) return "high";
  if (impact >= 0.05) return "moderate";
  return "low";
}

function buildOwnerExplanation(opp: Opportunity): string {
  return `${opp.supportingReviewCount} reviews here signal demand for ${humanize(opp.amenitySlug ?? opp.gapType)}. ${opp.description}`;
}
function buildOperatorExplanation(opp: Opportunity): string {
  const cost = opp.estimatedCostUsd != null ? `~$${opp.estimatedCostUsd}` : "cost TBD";
  return `Implement ${humanize(opp.amenitySlug ?? opp.gapType)} (${cost}, difficulty: ${opp.difficulty ?? "moderate"}). Verify local regulations/vendor lead time before install.`;
}

function humanize(slug: string): string {
  return slug.replace(/_/g, " ");
}
function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function fmtPct(p: number | null): string {
  return p === null ? "n/a" : `${(p * 100).toFixed(0)}%`;
}
