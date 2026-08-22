# 11 — Evidence Standards (Anti-Bias Charter)

This is the constitution of GDIP. It applies to every engine, answer, and report.
It is enforced structurally (schema), procedurally (jobs), and in prompting (LLM).

## The rule
> Every conclusion cites evidence. No unsupported claims. Where confidence is low,
> say so clearly. When evidence conflicts, present both perspectives. Never
> overstate certainty. Never reinforce bias.

## What "evidence-backed" means concretely
Every recommendation (and every insight, opportunity, and trend point) carries:
- Supporting **review count**
- Supporting **listings**
- **Confidence score**
- Sample **review excerpts**
- Estimated **implementation cost**
- Expected **guest impact**
- **ROI classification**
- **Last observed trend**

These are columns on `recommendations` and rows in `evidence` — not prose. A
recommendation with zero `evidence` rows is a bug, caught by an invariant test
(see [`10-roadmap.md`](10-roadmap.md)).

## Structural enforcement
- The `evidence` table is polymorphic and every analytic writer must populate it
  in the same transaction that writes the conclusion.
- `extraction_confidence` (per review) and per-mention `confidence` propagate into
  every aggregate; low-confidence inputs are down-weighted, never silently
  dropped.
- Sample size travels with every trend point (`trend_history.sample_size`) and
  insight (`supporting_review_count`).

## Confidence, honestly
- Confidence is computed from sample size, extraction confidence, source
  agreement, and recency — and is **always displayed**.
- Low-confidence conclusions are shown and labeled, not hidden. "We don't have
  enough data yet" is a valid, first-class output.
- The dashboard and reports style low-confidence items distinctly so they are
  never mistaken for strong findings.

## Conflict, surfaced
- When retrieved/aggregated evidence disagrees (some guests love the lake-facing
  open plan, others find it noisy), GDIP presents **both** sides and **lowers**
  confidence. It does not pick a winner to make a tidy story.
- Contradictions between evidence and the operator's stated assumptions are
  surfaced explicitly, not smoothed over.

## Anti-bias mandates
- **No wishful recommendations.** Nothing is recommended because it "sounds good."
  If the corpus doesn't support it, it isn't emitted (or is emitted flagged as
  `unproven`).
- **No confirmation bias.** The system does not preferentially surface evidence
  that agrees with prior recommendations or the operator's priors.
- **No certainty inflation.** Estimates (cost, ROI, revenue impact) are labeled as
  estimates with their basis; ranges over false precision.

## LLM-level enforcement
- Extraction returns `extraction_confidence`; validated by Zod; low values
  down-weight downstream.
- Synthesis/RAG prompts require answering **only** from provided context, citing
  excerpts, stating confidence, and emitting "insufficient evidence" when
  retrieval is thin — with tests asserting the ungrounded-answer path is refused.

## Operator's guarantee
Because of the above, the operator can trust that when GDIP says "do this," it can
immediately answer "why, based on what, and how sure are we?" — and when GDIP is
unsure, it will say so rather than bluff.
