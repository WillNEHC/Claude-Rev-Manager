import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runExtraction } from "../src/ai/pipeline";
import { InMemoryExtractionRepository, type UnprocessedReview } from "../src/lib/db/extraction-repository";
import type { LlmExtractor } from "../src/ai/extract";
import type { ExtractionInput } from "../src/ai/prompt";

function golden(name: string): { review: string; expected: unknown } {
  return JSON.parse(readFileSync(`tests/fixtures/extraction/${name}.json`, "utf8"));
}
const family = golden("family-firepit");
const remote = golden("remote-ops");

/** Fake extractor: maps review body -> a preset raw output (or throws). */
class FakeExtractor implements LlmExtractor {
  readonly model = "fake-model";
  constructor(private readonly outputs: Map<string, unknown | (() => never)>) {}
  async extractRaw(input: ExtractionInput): Promise<unknown> {
    const out = this.outputs.get(input.body);
    if (typeof out === "function") return (out as () => never)();
    return out;
  }
}

function review(id: string, body: string): UnprocessedReview {
  return { id, marketId: "mkt", listingId: "lst", hostId: "host", source: "airbnb", body };
}

describe("extraction pipeline", () => {
  it("extracts, validates, and persists golden reviews with correct fan-out", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", family.review), review("r2", remote.review)]);
    const extractor = new FakeExtractor(
      new Map([
        [family.review, family.expected],
        [remote.review, remote.expected],
      ]),
    );

    const result = await runExtraction({ repo, extractor });

    expect(result).toEqual({ processed: 2, failed: 0 });
    expect(repo.processed.size).toBe(2);
    expect(repo.extractions.size).toBe(2);
    // Mention fan-out totals across both goldens.
    expect(repo.mentionTotals).toEqual({
      amenities: 5,
      categories: 7,
      personas: 3,
      opsIssues: 2,
      delighters: 0,
      places: 1,
    });
    // Emergent persona flagged; seed persona not.
    expect(repo.personasSeen.get("photographers")).toBe(true);
    expect(repo.personasSeen.get("families")).toBe(false);
    expect(repo.placesSeen.has("canoe club")).toBe(true);
  });

  it("quarantines invalid model output — not written, review left unprocessed", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", family.review)]);
    const invalid = { ...(family.expected as Record<string, unknown>), extraction_confidence: 5 };
    const extractor = new FakeExtractor(new Map([[family.review, invalid]]));

    const result = await runExtraction({ repo, extractor });

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(repo.extractions.size).toBe(0); // nothing written
    expect(repo.processed.has("r1")).toBe(false); // stays eligible for retry
    expect(repo.failures).toHaveLength(1);
    expect(repo.failures[0]!.reviewId).toBe("r1");
  });

  it("quarantines when the extractor throws", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", family.review)]);
    const extractor = new FakeExtractor(
      new Map([[family.review, () => { throw new Error("model unavailable"); }]]),
    );

    const result = await runExtraction({ repo, extractor });

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(repo.failures[0]!.error).toContain("model unavailable");
  });

  it("only processes the unprocessed queue (idempotent re-run)", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", family.review)]);
    const extractor = new FakeExtractor(new Map([[family.review, family.expected]]));

    const first = await runExtraction({ repo, extractor });
    const second = await runExtraction({ repo, extractor });
    expect(first).toEqual({ processed: 1, failed: 0 });
    expect(second).toEqual({ processed: 0, failed: 0 }); // nothing left to do
  });
});
