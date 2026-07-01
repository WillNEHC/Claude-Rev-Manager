import { describe, it, expect } from "vitest";
import { buildRecommendations } from "../src/engines/recommend";
import type { Opportunity, Recommendation, TrendPoint } from "../src/engines/types";

function opp(slug: string, o: Partial<Opportunity>): Opportunity {
  return {
    marketId: "mkt_b",
    gapType: "amenity",
    title: `Add ${slug}`,
    description: `demand for ${slug}`,
    amenitySlug: slug,
    difficulty: "easy",
    estimatedCostUsd: 1000,
    confidence: 0.6,
    supportingReviewCount: 8,
    expectedReviewImpact: 0.1,
    evidence: [{ reviewId: "r1", excerpt: `wish for ${slug}` }],
    ...o,
  };
}

const noTrends = new Map<string, TrendPoint>();

describe("recommendation engine", () => {
  it("ranks higher-impact, higher-confidence opportunities first", () => {
    const recs = buildRecommendations({
      opportunities: [
        opp("kayak", { expectedReviewImpact: 0.06, confidence: 0.5, supportingReviewCount: 6 }),
        opp("fire_pit", { expectedReviewImpact: 0.2, confidence: 0.8, supportingReviewCount: 12 }),
      ],
      trends: noTrends,
      priorRecommendations: [],
      reportMonth: "2026-06-01",
    });
    expect(recs[0]!.title).toBe("Add fire_pit");
    expect(recs[0]!.priorityScore).toBeGreaterThan(recs[1]!.priorityScore);
    expect(recs[0]!.changeType).toBe("new");
  });

  it("assigns ROI class from impact and cost", () => {
    const [exceptional] = buildRecommendations({
      opportunities: [opp("fire_pit", { expectedReviewImpact: 0.2, confidence: 0.8, estimatedCostUsd: 1000 })],
      trends: noTrends,
      priorRecommendations: [],
      reportMonth: "2026-06-01",
    });
    expect(exceptional!.roiClass).toBe("exceptional");

    const [unproven] = buildRecommendations({
      opportunities: [opp("kayak", { expectedReviewImpact: 0.2, confidence: 0.3, supportingReviewCount: 3 })],
      trends: noTrends,
      priorRecommendations: [],
      reportMonth: "2026-06-01",
    });
    expect(unproven!.roiClass).toBe("unproven"); // thin evidence overrides
  });

  it("diffs against last month: strengthened + retired transitions", () => {
    const prior: Recommendation[] = [
      { key: "mkt_b:amenity:fire_pit", marketId: "mkt_b", reportMonth: "2026-05-01", title: "Add fire_pit", ownerExplanation: "", operatorExplanation: "", supportingReviewCount: 5, confidence: 0.5, roiClass: "moderate", expectedGuestImpact: "", priorityScore: 0.1, changeType: "new", evidence: [{ excerpt: "prior" }] },
      { key: "mkt_b:amenity:old_thing", marketId: "mkt_b", reportMonth: "2026-05-01", title: "Add old_thing", ownerExplanation: "", operatorExplanation: "", supportingReviewCount: 5, confidence: 0.5, roiClass: "low", expectedGuestImpact: "", priorityScore: 0.2, changeType: "new", evidence: [{ excerpt: "prior2" }] },
    ];
    const recs = buildRecommendations({
      opportunities: [opp("fire_pit", { expectedReviewImpact: 0.2, confidence: 0.8, supportingReviewCount: 12 })],
      trends: noTrends,
      priorRecommendations: prior,
      reportMonth: "2026-06-01",
    });
    const firePit = recs.find((r) => r.key === "mkt_b:amenity:fire_pit")!;
    expect(firePit.changeType).toBe("strengthened"); // score rose vs prior 0.1
    const retired = recs.find((r) => r.key === "mkt_b:amenity:old_thing")!;
    expect(retired.changeType).toBe("retired");
    expect(retired.priorityScore).toBe(0);
  });

  it("carries evidence onto every recommendation", () => {
    const recs = buildRecommendations({
      opportunities: [opp("fire_pit", {})],
      trends: noTrends,
      priorRecommendations: [],
      reportMonth: "2026-06-01",
    });
    expect(recs[0]!.evidence.length).toBeGreaterThan(0);
  });
});
