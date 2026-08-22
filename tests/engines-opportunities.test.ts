import { describe, it, expect } from "vitest";
import { classifyAmenities } from "../src/engines/expectation-index";
import { detectAmenityOpportunities } from "../src/engines/opportunities";
import type { AmenityStat } from "../src/engines/types";

// fire_pit is prevalent + loved + delighter-linked in market A, rare but wished-for in market B.
const amenityStats: AmenityStat[] = [
  {
    marketId: "mkt_a",
    amenitySlug: "fire_pit",
    reviewsInPeriod: 100,
    mentions: 20,
    positive: 16,
    negative: 2,
    delighterCooccur: 16,
    evidence: [{ excerpt: "loved the fire pit" }],
  },
  {
    marketId: "mkt_b",
    amenitySlug: "fire_pit",
    reviewsInPeriod: 100,
    mentions: 6,
    positive: 0,
    negative: 6,
    delighterCooccur: 0,
    evidence: [{ reviewId: "r1", excerpt: "wish there'd been a fire pit" }],
  },
];

describe("opportunity engine", () => {
  it("surfaces an amenity gap in the market with demand but low supply", () => {
    const classifications = classifyAmenities(amenityStats);
    expect(classifications[0]!.classification).toBe("delight"); // precondition

    const opps = detectAmenityOpportunities(amenityStats, classifications, {
      costHints: { fire_pit: { costUsd: 1000, difficulty: "easy" } },
    });

    expect(opps).toHaveLength(1);
    const o = opps[0]!;
    expect(o.marketId).toBe("mkt_b"); // the under-supplied market
    expect(o.amenitySlug).toBe("fire_pit");
    expect(o.supportingReviewCount).toBe(6);
    expect(o.estimatedCostUsd).toBe(1000);
    expect(o.difficulty).toBe("easy");
    expect(o.evidence.length).toBeGreaterThan(0); // evidence carried
    expect(o.expectedReviewImpact).toBeGreaterThan(0);
  });

  it("does not surface a gap without enough demand evidence", () => {
    const classifications = classifyAmenities(amenityStats);
    const opps = detectAmenityOpportunities(amenityStats, classifications, { minDemandReviews: 10 });
    expect(opps).toHaveLength(0); // demand of 6 < required 10
  });

  it("ignores amenities not classified as delighters", () => {
    const stakes: AmenityStat[] = [
      { marketId: "mkt_a", amenitySlug: "fast_wifi", reviewsInPeriod: 100, mentions: 40, positive: 4, negative: 30, delighterCooccur: 0, evidence: [{ excerpt: "wifi" }] },
      { marketId: "mkt_b", amenitySlug: "fast_wifi", reviewsInPeriod: 100, mentions: 5, positive: 0, negative: 5, delighterCooccur: 0, evidence: [{ excerpt: "no wifi" }] },
    ];
    const opps = detectAmenityOpportunities(stakes, classifyAmenities(stakes));
    expect(opps).toHaveLength(0); // table_stakes, not a delight gap
  });
});
