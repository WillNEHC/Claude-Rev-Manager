import { describe, it, expect } from "vitest";
import { assembleReport, type ReportInput } from "../src/reports/generate";
import { renderHtml } from "../src/reports/render";
import type { Recommendation, TrendPoint, Opportunity, MarketInsight } from "../src/engines/types";

function rec(o: Partial<Recommendation>): Recommendation {
  return {
    key: "k", marketId: "m", reportMonth: "2026-06-01", title: "Add fire pit", ownerExplanation: "o", operatorExplanation: "op",
    supportingReviewCount: 10, confidence: 0.7, roiClass: "high", expectedGuestImpact: "+0.1", priorityScore: 0.5,
    changeType: "new", evidence: [{ excerpt: "wish there was a fire pit" }], ...o,
  };
}
function trend(o: Partial<TrendPoint>): TrendPoint {
  return { marketId: "m", metricKey: "amenity.fire_pit.mention_rate", entityType: "amenity", periodStart: "2026-06-01", periodGrain: "month", value: 0.2, prevValue: 0.1, delta: 0.1, deltaPct: 1, direction: "up", sampleSize: 12, ...o };
}

const input: ReportInput = {
  reportMonth: "2026-06-01",
  marketName: "Squam Lake",
  reviewsAnalyzed: 420,
  recommendations: [
    rec({ title: "Add fire pit", priorityScore: 0.6, confidence: 0.8 }),
    rec({ title: "Add kayak", priorityScore: 0.3, confidence: 0.4 }), // low confidence
    rec({ title: "Old thing", changeType: "retired", priorityScore: 0 }),
  ],
  trends: [
    trend({}),
    trend({ metricKey: "category.cleanliness.negative_rate", entityType: "category", direction: "up", deltaPct: 0.5 }),
  ],
  opportunities: [
    { marketId: "m", gapType: "amenity", title: "fire pit gap", description: "d", confidence: 0.7, supportingReviewCount: 10, expectedReviewImpact: 0.12, evidence: [{ excerpt: "e" }] },
    { marketId: "m", gapType: "operational", title: "wifi reliability", description: "d", confidence: 0.6, supportingReviewCount: 8, evidence: [{ excerpt: "e" }] },
  ] as Opportunity[],
  insights: [
    { marketId: "m", insightType: "market_profile", title: "Squam profile", summary: "great docks, wifi complaints", confidence: 0.8, supportingReviewCount: 20, evidence: [{ excerpt: "e" }] },
  ] as MarketInsight[],
};

describe("report generation", () => {
  it("assembles sections, excludes retired recs, and flags low confidence", () => {
    const report = assembleReport(input);
    const recSection = report.sections.find((s) => s.id === "recommendations")!;
    expect(recSection.items!.length).toBe(2); // retired excluded
    expect(report.confidenceSummary.lowConfidenceCount).toBe(1); // the kayak rec
    expect(report.confidenceSummary.reviewsAnalyzed).toBe(420);
    expect(report.executiveSummary).toContain("Squam Lake");
  });

  it("builds an evidence appendix from recommendation evidence", () => {
    const report = assembleReport(input);
    expect(report.appendix.length).toBeGreaterThan(0);
    expect(report.appendix[0]!.excerpts[0]).toContain("fire pit");
  });

  it("includes an operational watch list", () => {
    const report = assembleReport(input);
    const watch = report.sections.find((s) => s.id === "operational-watch-list")!;
    expect(watch.items!.map((i) => i.label)).toContain("wifi reliability");
  });

  it("renders self-contained HTML with the data, and escapes markup", () => {
    const report = assembleReport({ ...input, marketName: "Squam <script>" });
    const html = renderHtml(report);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Add fire pit");
    expect(html).not.toContain("<script>"); // escaped
    expect(html).toContain("Squam &lt;script&gt;");
  });
});
