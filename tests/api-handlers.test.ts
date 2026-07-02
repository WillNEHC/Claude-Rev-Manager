import { describe, it, expect } from "vitest";
import { handleRecommendations, handleEvidence, handleOverview, type RecommendationRow } from "../src/api/handlers";
import { InMemoryDashboardRepository } from "../src/api/in-memory-dashboard";
import { handleSearch } from "../src/api/search-handler";
import { InMemoryRetriever } from "../src/rag/retriever";
import type { AnswerSynthesizer } from "../src/rag/synthesize";

const UUID = "11111111-1111-1111-1111-111111111111";

const rec = (o: Partial<RecommendationRow>): RecommendationRow => ({
  id: UUID, marketSlug: "squam-lake", title: "Add fire pit", priorityScore: 0.6, roiClass: "high",
  confidence: 0.8, supportingReviewCount: 10, changeType: "new", evidenceRef: { subjectType: "recommendation", subjectId: UUID }, ...o,
});

const repo = new InMemoryDashboardRepository({
  reviewCount: 420,
  recommendations: [rec({ title: "Add fire pit", priorityScore: 0.6 }), rec({ title: "Add kayak", priorityScore: 0.3, marketSlug: "lake-sunapee" })],
  evidence: { [`recommendation:${UUID}`]: [{ reviewId: "r1", excerpt: "wish for a fire pit", weight: 1 }] },
});

class FakeSynth implements AnswerSynthesizer {
  async synthesize(): Promise<string> {
    return "grounded answer";
  }
}

describe("dashboard API handlers", () => {
  it("lists recommendations, filtered by market and ranked", async () => {
    const res = await handleRecommendations(repo, { market: "squam-lake", sort: "priority", limit: "10" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0]!.title).toBe("Add fire pit");
    }
  });

  it("rejects an invalid sort param with 400", async () => {
    const res = await handleRecommendations(repo, { sort: "bogus" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it("returns evidence for a subject (reverse lookup)", async () => {
    const res = await handleEvidence(repo, { subject_type: "recommendation", subject_id: UUID });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0]!.excerpt).toContain("fire pit");
  });

  it("rejects a non-uuid subject_id with 400", async () => {
    const res = await handleEvidence(repo, { subject_type: "recommendation", subject_id: "not-a-uuid" });
    expect(res.ok).toBe(false);
  });

  it("shapes the overview bundle", async () => {
    const res = await handleOverview(repo, {});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.reviewCount).toBe(420);
      expect(res.data.recommendationCount).toBe(2);
    }
  });

  it("search handler answers grounded questions and validates input", async () => {
    const retriever = new InMemoryRetriever({
      chunks: [
        { reviewId: "r1", marketId: "m", content: "loved the dock", similarity: 0.8 },
        { reviewId: "r2", marketId: "m", content: "great host", similarity: 0.7 },
        { reviewId: "r3", marketId: "m", content: "clean kitchen", similarity: 0.6 },
      ],
    });
    const deps = { retriever, synthesizer: new FakeSynth() };
    const ok = await handleSearch(deps, { question: "What do guests love here?" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.insufficientEvidence).toBe(false);

    const bad = await handleSearch(deps, { question: "hi" }); // too short
    expect(bad.ok).toBe(false);
  });
});
