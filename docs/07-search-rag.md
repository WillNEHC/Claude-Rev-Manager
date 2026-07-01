# 07 — Natural-Language Search & RAG

## Goal
Let the operator ask plain-English questions and get grounded, evidence-cited
answers over the review corpus — e.g.:
- "What do families complain about on Squam Lake?"
- "What amenities generate repeat guests?"
- "What restaurants are mentioned most often by Lake Sunapee visitors?"
- "What causes guests to mention five-star experiences?"
- "What improvements have the highest ROI?"
- "Why do guests choose Winnipesaukee over Newfound?"
- "What do remote workers care about?"
- "What amenities are trending upward?"

## Two retrieval paths, one answer
Some questions are semantic ("five-star experiences"), others are structured
("most-mentioned restaurants on Sunapee", "trending amenities"). GDIP routes and
often blends both:

1. **Structured retrieval** — for questions that map to aggregations, query the
   materialized engine tables directly (`trend_history`, `amenity_mentions`,
   `place_mentions` + `local_businesses`, `review_personas`, `recommendations`).
   Fast, exact, already evidence-linked. "Trending amenities" = a `trend_history`
   query, not a vector search.

2. **Semantic retrieval (RAG)** — for open-ended questions, embed the query and
   call `match_reviews(query_embedding, match_count, filter_market, min_similarity)`
   (defined in migration 0004) to pull the most relevant review chunks, optionally
   scoped to a market and post-filtered by persona/category/date via the mention
   tables.

A lightweight router (Phase 4) classifies the question and picks structured,
semantic, or hybrid. When in doubt it runs both and lets the synthesis step
reconcile.

## RAG answer flow
```
question
   │
   ├─▶ [router] structured? semantic? hybrid?
   │
   ├─▶ structured query results (aggregates + evidence rows)
   │
   ├─▶ embed(question) ─▶ match_reviews() ─▶ top-k review chunks
   │        └─ post-filter by market/persona/category/date
   │
   ▼
 [synthesis model] answer STRICTLY from retrieved context
   │   - cites review excerpts + counts
   │   - states confidence; flags low sample size
   │   - surfaces contradictions if retrieved evidence disagrees
   ▼
 answer + evidence panel (clickable excerpts → source reviews)
```

## Grounding & honesty rules
- The synthesis prompt is instructed to answer **only** from retrieved context and
  to say "insufficient evidence" when retrieval is thin — never to fill gaps from
  general knowledge.
- Every answer returns the supporting review count and a set of excerpt citations
  the dashboard renders in an evidence panel. No uncited claims.
- If retrieved evidence conflicts, the answer presents both sides and lowers
  confidence. This mirrors the platform-wide evidence standard
  ([`11-evidence-standards.md`](11-evidence-standards.md)).

## Embedding strategy
- Embed review chunks at extraction time (`review_embeddings`) and selected
  synthesized objects (`insight_embeddings`) so RAG can retrieve both raw voice-of-
  guest and higher-order findings.
- Embedding model is configurable (`EMBEDDINGS_MODEL`); the pgvector column
  dimension in migration 0004 must match. Swapping models = re-embed + change the
  vector dimension.
- IVFFlat index `lists` parameter is tuned to corpus size and rebuilt as the
  corpus grows (roughly `sqrt(row_count)`).

## Performance
- Retrieval is capped (`match_count`) and market-scoped by default to keep context
  small and answers fast.
- Aggregation-heavy questions never scan raw text — they hit pre-computed engine
  tables. RAG is reserved for genuinely open-ended queries.
