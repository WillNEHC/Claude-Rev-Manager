import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk, StructuredRow } from "./types";

/**
 * Answer synthesis boundary. The synthesizer is instructed to answer ONLY from
 * the retrieved context and to cite excerpts; it never fills gaps from general
 * knowledge (docs/07, docs/11). Behind an interface so the pipeline's grounding
 * behavior is testable without an LLM.
 */
export interface AnswerSynthesizer {
  synthesize(input: {
    question: string;
    context: RetrievedChunk[];
    structured: StructuredRow[];
  }): Promise<string>;
}

const SYSTEM = [
  "You answer questions about short-term-rental guest reviews for a New Hampshire lake market.",
  "Answer ONLY from the provided context (review excerpts and/or structured rows). Do NOT use outside knowledge.",
  "Cite the guest voice by quoting short excerpts. If the context is thin or conflicting, say so plainly and lower your certainty — do not guess.",
  "If retrieved evidence disagrees, present both sides rather than picking one.",
  "Be concise and specific; lead with the answer.",
].join("\n");

export class AnthropicSynthesizer implements AnswerSynthesizer {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(opts: { apiKey: string; model?: string; client?: Anthropic }) {
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? process.env.GDIP_SYNTHESIS_MODEL ?? "claude-opus-4-8";
  }

  async synthesize(input: {
    question: string;
    context: RetrievedChunk[];
    structured: StructuredRow[];
  }): Promise<string> {
    const contextBlock = input.context
      .map((c, i) => `[R${i + 1}] (similarity ${c.similarity.toFixed(2)}) ${c.content}`)
      .join("\n");
    const structuredBlock = input.structured
      .map((s) => `- ${s.label}: ${s.value}${s.detail ? ` (${s.detail})` : ""}`)
      .join("\n");

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Question: ${input.question}\n\nReview excerpts:\n${contextBlock || "(none)"}\n\nStructured data:\n${structuredBlock || "(none)"}\n\nAnswer using only the above.`,
        },
      ],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
}
