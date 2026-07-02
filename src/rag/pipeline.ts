import { classifyQuestion } from "./router";
import type { Retriever } from "./retriever";
import type { AnswerSynthesizer } from "./synthesize";
import type { SearchAnswer, Citation, RetrievedChunk, StructuredRow } from "./types";

/**
 * RAG answer pipeline (docs/07). Routes the question, gathers structured and/or
 * semantic context, and — crucially — refuses to answer from an empty well: if
 * retrieval is below the evidence floor it returns an explicit
 * "insufficient evidence" answer WITHOUT calling the LLM. Otherwise it
 * synthesizes a grounded answer and attaches citations. Confidence scales with
 * how much supporting evidence was retrieved.
 */

export interface AnswerOptions {
  minEvidence?: number; // semantic chunks (or structured rows) required to answer
  semanticLimit?: number;
  minSimilarity?: number;
}

export async function answerQuestion(
  question: string,
  deps: { retriever: Retriever; synthesizer: AnswerSynthesizer },
  options: AnswerOptions = {},
): Promise<SearchAnswer> {
  const minEvidence = options.minEvidence ?? 3;
  const { route, filters } = classifyQuestion(question);

  const marketId = filters.marketSlug ? await deps.retriever.resolveMarketId(filters.marketSlug) : undefined;

  let context: RetrievedChunk[] = [];
  let structured: StructuredRow[] = [];

  if (route === "semantic" || route === "hybrid") {
    context = await deps.retriever.semanticSearch({
      question,
      marketId: marketId ?? undefined,
      limit: options.semanticLimit ?? 20,
      minSimilarity: options.minSimilarity ?? 0.2,
    });
  }
  if (route === "structured" || route === "hybrid") {
    structured = await deps.retriever.structured({ question, filters });
  }

  const evidenceCount = context.length + structured.length;
  const noStructured = structured.length === 0;

  // Insufficient evidence, by route:
  //  - structured: no structured rows to report;
  //  - semantic: too few supporting excerpts;
  //  - hybrid: too few excerpts AND no structured backing;
  //  - always: nothing retrieved at all.
  let insufficient = evidenceCount === 0;
  if (route === "structured") insufficient ||= noStructured;
  else if (route === "semantic") insufficient ||= context.length < minEvidence;
  else insufficient ||= context.length < minEvidence && noStructured;

  if (insufficient) {
    return {
      question,
      route,
      answer:
        "There isn't enough evidence in the collected reviews to answer this confidently yet. As more reviews are ingested this will improve.",
      confidence: 0,
      supportingCount: evidenceCount,
      citations: [],
      structured,
      insufficientEvidence: true,
    };
  }

  const answer = await deps.synthesizer.synthesize({ question, context, structured });
  const citations: Citation[] = context.slice(0, 8).map((c) => ({
    reviewId: c.reviewId,
    excerpt: truncate(c.content, 240),
  }));

  return {
    question,
    route,
    answer,
    confidence: confidenceFrom(context.length, structured.length),
    supportingCount: evidenceCount,
    citations,
    structured,
    insufficientEvidence: false,
  };
}

function confidenceFrom(semantic: number, structured: number): number {
  // Saturating confidence: more supporting evidence → higher, capped at 0.95.
  const raw = Math.min(1, (semantic + structured * 2) / 20);
  return Math.round((0.3 + 0.65 * raw) * 100) / 100;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
