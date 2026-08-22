import { describe, it, expect } from "vitest";
import { runMonthlyPipeline, previousMonth } from "../src/engines/pipeline";
import { InMemoryAnalyticsSource } from "../src/engines/analytics";
import { InMemoryEngineRepository, MissingEvidenceError } from "../src/engines/repository";
import type { AmenityStat, CategoryStat, PeriodMetric, Recommendation } from "../src/engines/types";

const amenityStats: AmenityStat[] = [
  { marketId: "mkt_a", amenitySlug: "fire_pit", reviewsInPeriod: 100, mentions: 20, positive: 16, negative: 2, delighterCooccur: 16, evidence: [{ excerpt: "loved the fire pit" }] },
  { marketId: "mkt_b", amenitySlug: "fire_pit", reviewsInPeriod: 100, mentions: 8, positive: 0, negative: 8, delighterCooccur: 0, evidence: [{ reviewId: "r1", excerpt: "wish there'd been a fire pit" }] },
];
const categoryStats: CategoryStat[] = [
  { marketId: "mkt_a", categorySlug: "outdoor_experience", mentions: 30, positive: 25, negative: 1, evidence: [{ excerpt: "great outdoors" }] },
  { marketId: "mkt_b", categorySlug: "technology", mentions: 12, positive: 1, negative: 10, evidence: [{ excerpt: "wifi issues" }] },
];
const current: PeriodMetric[] = [
  { metricKey: "amenity.fire_pit.mention_rate", entityType: "amenity", marketId: "mkt_b", periodStart: "2026-06-01", value: 0.08, sampleSize: 8 },
];
const previous: PeriodMetric[] = [
  { metricKey: "amenity.fire_pit.mention_rate", entityType: "amenity", marketId: "mkt_b", periodStart: "2026-05-01", value: 0.03, sampleSize: 3 },
];

describe("monthly pipeline (end to end)", () => {
  it("produces ranked, evidence-backed recommendations from raw stats", async () => {
    const analytics = new InMemoryAnalyticsSource({ current, previous, amenityStats, categoryStats });
    const repo = new InMemoryEngineRepository();

    const result = await runMonthlyPipeline({ analytics, repo, reportMonth: "2026-06-01" });

    expect(result.trends).toBeGreaterThan(0);
    expect(result.classifications).toBeGreaterThan(0);
    expect(result.opportunities).toBeGreaterThanOrEqual(1);
    expect(result.insights).toBeGreaterThanOrEqual(1);
    expect(result.recommendations).toBeGreaterThanOrEqual(1);
    expect(result.topRecommendations.length).toBeGreaterThan(0);

    // fire_pit gap in mkt_b should be the recommendation, evidence-backed.
    const rec = repo.recommendations.find((r) => r.marketId === "mkt_b")!;
    expect(rec.evidence.length).toBeGreaterThan(0);
    expect(rec.lastObservedTrend).toContain("up"); // rising mention rate picked up

    // Every persisted analytic object carries evidence (invariant held).
    for (const o of repo.opportunities) expect(o.evidence.length).toBeGreaterThan(0);
    for (const i of repo.insights) expect(i.evidence.length).toBeGreaterThan(0);
    for (const r of repo.recommendations) expect(r.evidence.length).toBeGreaterThan(0);
  });

  it("enforces the evidence invariant — persisting an unbacked recommendation throws", async () => {
    const repo = new InMemoryEngineRepository();
    const bad: Recommendation = {
      key: "x", marketId: "m", reportMonth: "2026-06-01", title: "no evidence", ownerExplanation: "", operatorExplanation: "",
      supportingReviewCount: 0, confidence: 0.9, roiClass: "high", expectedGuestImpact: "", priorityScore: 1, changeType: "new", evidence: [],
    };
    await expect(repo.saveRecommendations([bad])).rejects.toBeInstanceOf(MissingEvidenceError);
  });

  it("computes the previous-month key across a year boundary", () => {
    expect(previousMonth("2026-01-01")).toBe("2025-12-01");
    expect(previousMonth("2026-06-01")).toBe("2026-05-01");
  });
});
