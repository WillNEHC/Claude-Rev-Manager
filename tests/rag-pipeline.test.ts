import { describe, it, expect } from "vitest";
import { answerQuestion } from "../src/rag/pipeline";
import { InMemoryRetriever } from "../src/rag/retriever";
import type { AnswerSynthesizer } from "../src/rag/synthesize";
import type { RetrievedChunk, StructuredRow } from "../src/rag/types";

class FakeSynthesizer implements AnswerSynthesizer {
  calls = 0;
  async synthesize(input: { context: RetrievedChunk[]; structured: StructuredRow[] }): Promise<string> {
    this.calls += 1;
    return `grounded answer from ${input.context.length} excerpts and ${input.structured.length} rows`;
  }
}

function chunk(id: string, content: string, similarity = 0.7): RetrievedChunk {
  return { reviewId: id, marketId: "mkt_b", content, similarity };
}

describe("RAG pipeline", () => {
  it("answers a semantic question grounded in retrieved excerpts, with citations", async () => {
    const retriever = new InMemoryRetriever({
      chunks: [chunk("r1", "families wished for a fire pit"), chunk("r2", "kids loved the dock"), chunk("r3", "wanted s'mores")],
      markets: { "squam-lake": "mkt_b" },
    });
    const synth = new FakeSynthesizer();
    const ans = await answerQuestion("What do families complain about on Squam Lake?", { retriever, synthesizer: synth });

    expect(ans.insufficientEvidence).toBe(false);
    expect(synth.calls).toBe(1);
    expect(ans.citations.length).toBe(3);
    expect(ans.citations[0]!.reviewId).toBe("r1");
    expect(ans.confidence).toBeGreaterThan(0);
    expect(ans.supportingCount).toBe(3);
  });

  it("refuses to answer (insufficient evidence) when retrieval is empty — without calling the LLM", async () => {
    const retriever = new InMemoryRetriever({ chunks: [] });
    const synth = new FakeSynthesizer();
    const ans = await answerQuestion("Why do guests love the sunsets?", { retriever, synthesizer: synth });

    expect(ans.insufficientEvidence).toBe(true);
    expect(ans.citations).toHaveLength(0);
    expect(ans.confidence).toBe(0);
    expect(synth.calls).toBe(0); // never fabricates from an empty well
  });

  it("treats a semantic question with too few excerpts as insufficient", async () => {
    const retriever = new InMemoryRetriever({ chunks: [chunk("r1", "one lonely mention")] });
    const synth = new FakeSynthesizer();
    const ans = await answerQuestion("Why do remote workers choose this cabin?", { retriever, synthesizer: synth }, { minEvidence: 3 });
    expect(ans.insufficientEvidence).toBe(true);
    expect(synth.calls).toBe(0);
  });

  it("answers a structured question from structured rows", async () => {
    const retriever = new InMemoryRetriever({
      chunks: [],
      structured: [
        { kind: "place", label: "Canoe Club", value: 12 },
        { kind: "place", label: "The Common Man", value: 8 },
      ],
    });
    const synth = new FakeSynthesizer();
    const ans = await answerQuestion("What restaurants are mentioned most often?", { retriever, synthesizer: synth });
    expect(ans.route).toBe("structured");
    expect(ans.insufficientEvidence).toBe(false);
    expect(ans.structured).toHaveLength(2);
  });
});
