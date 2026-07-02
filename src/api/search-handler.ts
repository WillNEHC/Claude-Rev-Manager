import { z } from "zod";
import { answerQuestion, type AnswerOptions } from "../rag/pipeline";
import type { Retriever } from "../rag/retriever";
import type { AnswerSynthesizer } from "../rag/synthesize";
import type { SearchAnswer } from "../rag/types";
import type { HandlerResult } from "./handlers";

/** POST /api/search body schema. */
export const searchBody = z.object({
  question: z.string().min(3).max(500),
  options: z
    .object({
      minEvidence: z.number().int().min(0).max(50).optional(),
      semanticLimit: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

export async function handleSearch(
  deps: { retriever: Retriever; synthesizer: AnswerSynthesizer },
  body: unknown,
): Promise<HandlerResult<SearchAnswer>> {
  const p = searchBody.safeParse(body);
  if (!p.success) {
    return { ok: false, status: 400, error: p.error.issues.map((i) => i.message).join("; ") };
  }
  const options: AnswerOptions = p.data.options ?? {};
  const answer = await answerQuestion(p.data.question, deps, options);
  return { ok: true, data: answer };
}
