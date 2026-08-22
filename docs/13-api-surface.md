# 13 — API Surface

The dashboard talks to Next.js API routes under `src/app/api/`. Read-heavy
endpoints query materialized engine tables; nothing triggers heavy computation on
request (that's the monthly pipeline). All responses are evidence-linked where
they make a claim. Auth is a single operator (Supabase session); all routes
require it.

Conventions: JSON in/out, `market` accepts a slug or `all`, dates are ISO
`YYYY-MM`, list endpoints support `limit`/`cursor`, every analytic item includes
a `confidence` and an `evidence_ref` the client can expand.

## Read endpoints
| Method / Path | Purpose |
|---|---|
| `GET /api/markets` | List markets + activity status (for the selector). |
| `GET /api/overview?market=&month=` | Overview screen bundle: headline metrics, top rising/declining signals, top-5 recs, ops watch-list. |
| `GET /api/reviews?market=&persona=&category=&source=&rating=&from=&to=&q=` | Review Explorer: filtered, paginated reviews with their extracted tags. |
| `GET /api/reviews/:id` | One review + full extraction + all mention rows + source link. |
| `GET /api/amenities?market=&classification=&trend=` | Amenity Explorer: dictionary with Expectation-Index class, prevalence, +/- rates, trend. |
| `GET /api/trends?market=&metric=&grain=month|season|year&from=&to=` | Time series from `trend_history`, with sample sizes. |
| `GET /api/recommendations?market=&month=&sort=priority|roi|cost&status=` | Ranked recommendations with every mandated field. |
| `GET /api/recommendations/:id` | One recommendation + supporting listings + evidence excerpts + month-over-month history. |
| `GET /api/opportunities?market=&gap_type=&status=` | Detected gaps pre-recommendation. |
| `GET /api/compare?markets=a,b,c&month=` | Market-comparison matrix (personas, expectations, complaints, places…). |
| `GET /api/places?market=&type=restaurant|attraction|event&sort=mentions` | Ranked local-business mentions + avg sentiment. |
| `GET /api/evidence?subject_type=&subject_id=` | Reverse lookup: all reviews/excerpts backing any conclusion. |
| `GET /api/reports?market=&month=` | Report metadata + structured sections. |
| `GET /api/reports/:id/export?format=pdf|html` | Rendered report artifact. |

## Search (RAG)
| Method / Path | Purpose |
|---|---|
| `POST /api/search` | Natural-language question. Body: `{ question, market?, filters? }`. Routes structured/semantic/hybrid (see [`07-search-rag.md`](07-search-rag.md)); returns `{ answer, confidence, supporting_count, citations[] }`. Streams the answer. |

## Operational / job-trigger endpoints (operator-only, server-side keys)
These enqueue jobs; they don't run inline. Primarily for manual runs — the
scheduler calls the same job entrypoints directly.
| Method / Path | Purpose |
|---|---|
| `POST /api/jobs/ingest` | Trigger ingestion for a market/source (queues a `crawl_run`). |
| `POST /api/jobs/extract` | Process the unextracted-review queue. |
| `POST /api/jobs/pipeline` | Run the full monthly pipeline for a market/month. |
| `GET /api/jobs/:id` | Job/crawl-run status + counts (for monitoring). |

## Export
| Method / Path | Purpose |
|---|---|
| `GET /api/export/:resource.csv?...filters` | CSV of any list resource (reviews, recs, amenities, trends). |
| `POST /api/export/owner-brief` | Recommendation-only owner-facing brief for a property/owner. |

## Error & shape contract
- Errors: `{ error: { code, message } }` with appropriate HTTP status.
- Every analytic list item: `{ ...fields, confidence, sample_size?, evidence_ref: { subject_type, subject_id } }`.
- Low-confidence items are returned (not hidden) and flagged, so the client styles them per the evidence standard.
