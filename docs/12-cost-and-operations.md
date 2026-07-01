# 12 — Cost & Operations Model

Running GDIP at "hundreds of thousands of reviews" scale is affordable, but the
AI-extraction line is the one that scales with corpus size, so it drives the
model and batching choices. All figures below are **planning estimates** with
stated assumptions — verify against live pricing before committing budget. Model
prices are current as of the plan date.

## Unit prices (as planned)
| Service | Price | Notes |
|---|---|---|
| Claude Haiku 4.5 (extraction) | $1 / 1M input, $5 / 1M output | High-volume per-review work. |
| Claude Opus 4.8 (synthesis) | $5 / 1M input, $25 / 1M output | Low-volume: reports, recommendations, RAG answers. |
| Batch API | −50% on both | Backfill + monthly extraction are not latency-sensitive → use it. |
| Prompt caching | writes ~1.25×, reads ~0.1× | The shared extraction instructions/schema cache; only the review body is "fresh." |
| Embeddings (text-embedding-3-small) | ~$0.02 / 1M tokens | Effectively negligible at this scale. |
| Firecrawl | credit-based | Scales with pages crawled; see below. |
| Supabase | Free → Pro ~$25/mo | Pro recommended once the corpus and pgvector indexes grow. |

## Extraction cost — the model that matters
Per-review assumptions: ~2,000-token shared prefix (system + JSON schema +
few-shot), **cached**; ~150-token review body, fresh; ~400-token structured
output.

Per review ≈ cache-read(2,000 × $0.10/1M) + fresh-in(150 × $1/1M) + out(400 × $5/1M)
≈ **$0.0024**. With the Batch API (−50%): **~$0.0012/review**.

| Scenario | Reviews | Est. extraction cost (Batch) |
|---|---|---|
| Initial backfill (all 4 markets, 6–12 mo) | ~200,000 | **~$235** (list price ~$470) |
| Monthly incremental | ~15,000 new | **~$18/mo** |

Embeddings for a 200k backfill (~200 tok/review → 40M tok) ≈ **$0.80**. Ignore it.

## Synthesis cost (Opus 4.8)
Low volume — runs on *aggregated* engine outputs, not per review. A market
report synthesis ≈ 30k input + 10k output ≈ **$0.40**; recommendations + insights
per market per month add a few dollars. **~$10–20/mo** across all four markets.

## RAG query cost
Each natural-language answer: retrieval (cheap DB) + one Opus call over ~15–25
retrieved excerpts (~8k input + ~1k output) ≈ **~$0.06/question**. Even heavy
daily use is a few dollars a month.

## Firecrawl (the variable)
Cost scales with pages crawled, not reviews stored. Levers that keep it low:
- **Incremental crawling + change detection** — unchanged pages are skipped (`raw_pages` hash), so steady-state monthly crawls are far cheaper than the backfill.
- **Discovery filtering early** — non-qualifying listings are dropped before their reviews are fetched.
- **Caching + rate limiting** — avoids re-fetching within/across runs.
Budget the backfill as the spike; monthly steady-state is a fraction of it. Track
actual credit burn via `crawl_runs.pages_fetched` and set an alert threshold.

## Ballpark monthly operating cost (steady state)
| Line | Est. |
|---|---|
| Extraction (Batch, ~15k reviews) | ~$18 |
| Synthesis (reports + recs) | ~$15 |
| RAG queries | ~$5 |
| Embeddings | ~$1 |
| Supabase Pro | ~$25 |
| Firecrawl | variable — monitor |
| **Total (excl. Firecrawl)** | **~$65/mo** |

Plus a **one-time backfill** of roughly **$235–470** in extraction. This is a
tool that pays for itself on a single better amenity decision.

## Cost-control levers (in priority order)
1. **Cheap model for extraction, strong model only for synthesis.** Non-negotiable — it's the difference between ~$235 and ~$5k for a backfill.
2. **Batch API** for backfill and monthly extraction (−50%, and these aren't latency-sensitive).
3. **Prompt caching** on the extraction prefix (schema + instructions are identical across every review).
4. **Incremental everything** — dedup by content hash, skip unchanged pages, only embed/extract new reviews.
5. **Re-extract deliberately** — `schema_version` gates targeted reprocessing so a schema bump doesn't silently re-bill the whole corpus.

## Operational guardrails
- Every job persists counts (`crawl_runs`, job logs) → alert on `status='failed'`, `reviews_new=0` anomalies, or Firecrawl credit spikes.
- Extraction runs under a budget ceiling; a runaway batch is capped, not discovered on the invoice.
- Backfill is chunked per market so a failure is resumable and cost is observable incrementally.
