# 03 — Database Schema

The schema is defined as runnable SQL in [`supabase/migrations/`](../supabase/migrations/).
This doc explains the model; the migrations are authoritative.

## Migration files
| File | Contents |
|---|---|
| `0001_extensions_and_core.sql` | Extensions, enums, `set_updated_at`, and core dimensions: markets, hosts, listings, amenities, categories, personas. |
| `0002_reviews_and_extraction.sql` | Ingestion bookkeeping (crawl_runs, raw_pages), reviews, review_metadata, review_extractions, and the mention fan-out tables. |
| `0003_intelligence_and_reporting.sql` | local_businesses (+restaurant/attraction/event views), snapshots, trends, insights, opportunities, recommendations, evidence, history, reports. |
| `0004_embeddings_and_search.sql` | pgvector tables, `match_reviews()` RAG function, RLS policies. |
| `0005_seed_reference_data.sql` | Seeds 4 markets, category taxonomy, seed personas, starter amenities. |

## Entity groups

### 1. Dimensions (the "nouns")
- **markets** — top-level geography. Expansion = one row. Holds seed search terms + per-market `config` jsonb.
- **hosts** — operators, unique per `(platform, platform_host_id)`, with superhost status.
- **listings** — tracked properties. Carries the discovery-criteria flags (`is_entire_home`, `is_luxury`, `is_family_oriented`, `is_pet_friendly`) plus headline attributes; full history lives in snapshots.
- **amenities** — canonical amenity dictionary with the data-driven Guest Expectation classification (`table_stakes` / `delight` / `unknown`).
- **categories** — standardized, hierarchical review taxonomy (parent_id).
- **traveler_personas** — seed personas + emergent ones (`is_confirmed=false` until evidence promotes them).
- **local_businesses** — restaurants, breweries, coffee, attractions, events, wedding venues (sub-typed by `place_type`, with `restaurants`/`attractions`/`events` views).

### 2. Corpus & ingestion
- **crawl_runs** — one per ingestion execution; status + counts for monitoring.
- **raw_pages** — fetched payloads, unique by `(url, content_hash)` for change detection and reproducibility.
- **reviews** — the atomic unit. **Deduplicated by `(source, content_hash)`** — the structural guarantee that reviews are never duplicated. Carries `is_processed` for the extraction state machine.
- **review_metadata** — bulky/optional source fields kept off the hot table.

### 3. AI extraction output
- **review_extractions** — exactly one structured record per processed review. Scalar signals (sentiment, cleanliness/communication/checkin/value scores, boolean flags) as columns; open lists (memorable moments, exceptional phrases) as arrays; the full model output preserved in `raw` for audit.
- **Mention fan-out** (citation-grade edges, each with sentiment + confidence + excerpt):
  - `amenity_mentions` — positive/negative amenity signal (feeds Expectation Index + Trends).
  - `review_categories` — standardized category classification per review.
  - `review_personas` — persona assignment per review.
  - `operational_issues` — ops/maintenance pain points with severity.
  - `guest_delighters` — the memorable-experience atoms.
  - `place_mentions` — restaurant/attraction/etc. references, resolved to `local_businesses`.

### 4. Intelligence & reporting
- **monthly_snapshots** — append-only point-in-time facts per listing/market; the Trend engine diffs consecutive snapshots.
- **trend_history** — time series of any metric (`metric_key`) per market/entity, with delta, direction, and sample size.
- **market_insights** — synthesized narrative findings per market.
- **opportunities** — detected gaps with cost/difficulty/impact/confidence, pre-recommendation.
- **recommendations** — the monthly deliverable; carries every mandated field (supporting counts, confidence, cost, ROI class, difficulty, guest/revenue impact, priority score, owner + operator explanations, last observed trend).
- **recommendation_listings** — supporting listings per recommendation.
- **recommendation_history** — month-over-month evolution (new/persisted/strengthened/weakened/retired).
- **monthly_reports** — the generated report artifact + structured sections + confidence summary.

### 5. The evidence spine
- **evidence** — polymorphic `(subject_type, subject_id)` → citing `review_id` + `excerpt` + `weight`. This is the enforcement mechanism for "every conclusion cites evidence." Recommendations, opportunities, insights, trend points, and amenity classifications all attach evidence here.

### 6. Vectors
- **review_embeddings** / **insight_embeddings** — pgvector rows (dim matches the embedding model; default 1536). `match_reviews()` is the retrieval function the RAG layer calls (see [`07-search-rag.md`](07-search-rag.md)).

## ERD (logical)
```
markets 1───* listings *───1 hosts
   │              │
   │              *── listing_amenities ──* amenities
   │              │
   *              *
reviews *──1 listings                 amenities ──* amenity_mentions *──1 reviews
   │  1                                categories ──* review_categories *──1 reviews
   ├──1 review_metadata                personas  ──* review_personas   *──1 reviews
   ├──1 review_extractions             reviews  ──* operational_issues
   ├──*  amenity_mentions              reviews  ──* guest_delighters
   ├──*  review_categories             reviews  ──* place_mentions *──1 local_businesses
   ├──*  review_personas
   ├──*  review_embeddings
   └──*  evidence  ◀── recommendations / opportunities / market_insights / trends

markets 1──* monthly_snapshots        markets 1──* trend_history
markets 1──* opportunities 1──* recommendations 1──* recommendation_listings
recommendations 1──* recommendation_history
markets 1──* monthly_reports
```

## Indexing strategy
- Foreign-key access paths indexed (`listings.market_id`, `reviews.listing_id`, mention→entity).
- **Partial index** `idx_reviews_unprocessed` keeps the extractor's queue scan cheap.
- **Trigram GIN** indexes on `listings.title`, `reviews.body`, `local_businesses.name`, `place_mentions.raw_name` for fuzzy lookup and place resolution.
- **IVFFlat** cosine indexes on embeddings (`lists` tuned to corpus size; rebuild as it grows).
- Time-series composites (`trend_history(market_id, metric_key, period_start desc)`, `monthly_snapshots(market_id, snapshot_month)`).

## Conventions
- UUID PKs (`gen_random_uuid()`), `snake_case`, `timestamptz` everywhere, `created_at`/`updated_at` with the shared trigger.
- Enums for stable domains; jsonb (`config`, `metadata`, `raw`, `details`) for evolving/source-specific fields.
- Confidence stored as `numeric(4,3)` (0.000–1.000); sentiment scores as signed `numeric(4,3)` (-1..1).

## Scale posture
Designed for thousands of listings and hundreds of thousands of reviews with
monthly incremental updates. The hot path (extraction queue, mention aggregation)
is indexed; heavy analytics run in batch jobs and land in materialized engine
tables (`trend_history`, `market_insights`, `recommendations`) rather than being
computed per dashboard request.
