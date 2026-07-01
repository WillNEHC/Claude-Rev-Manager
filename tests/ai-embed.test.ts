import { describe, it, expect } from "vitest";
import { chunkText, type EmbeddingProvider } from "../src/ai/embed";
import { runEmbedding } from "../src/ai/pipeline";
import { InMemoryExtractionRepository, type UnprocessedReview } from "../src/lib/db/extraction-repository";

/** Deterministic fake: fixed-dimension vector per text, no network. */
class FakeEmbedder implements EmbeddingProvider {
  readonly model = "fake-embed";
  readonly dimension = 8;
  calls = 0;
  async embed(texts: string[]): Promise<number[][]> {
    this.calls += 1;
    return texts.map((t) => Array.from({ length: this.dimension }, (_, i) => (t.length + i) % 7));
  }
}

function review(id: string, body: string): UnprocessedReview {
  return { id, marketId: "mkt", listingId: null, hostId: null, source: "airbnb", body };
}

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("A short review.", 1200);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe("A short review.");
  });

  it("returns no chunks for empty/whitespace", () => {
    expect(chunkText("   \n  ", 1200)).toHaveLength(0);
  });

  it("splits long text into multiple bounded chunks on boundaries", () => {
    const sentence = "The dock was wonderful and the kids loved it. ";
    const long = sentence.repeat(20); // ~900 chars
    const chunks = chunkText(long, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(200);
    // Indices are contiguous from 0.
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
    // Reassembled content preserves all words.
    const joined = chunks.map((c) => c.content).join(" ").replace(/\s+/g, " ").trim();
    expect(joined).toContain("the kids loved it");
  });
});

describe("embedding pipeline", () => {
  it("embeds un-embedded reviews and stores per-chunk vectors", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", "Great stay, loved the dock."), review("r2", "   ")]);
    const embedder = new FakeEmbedder();

    const result = await runEmbedding({ repo, embedder });

    // r2 (empty body) is skipped; r1 embedded as one chunk.
    expect(result.embedded).toBe(1);
    expect(result.chunks).toBe(1);
    const stored = repo.embeddings.get("r1")!;
    expect(stored).toHaveLength(1);
    expect(stored[0]!.embedding).toHaveLength(8);
  });

  it("is idempotent — already-embedded reviews are not re-embedded", async () => {
    const repo = new InMemoryExtractionRepository();
    repo.seed([review("r1", "Great stay.")]);
    const embedder = new FakeEmbedder();
    await runEmbedding({ repo, embedder });
    const second = await runEmbedding({ repo, embedder });
    expect(second).toEqual({ embedded: 0, chunks: 0 });
  });
});
