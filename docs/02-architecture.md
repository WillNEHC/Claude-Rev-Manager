# 02 — Architecture

## Guiding principles
- **Config-driven behavior.** Markets, discovery filters, sources, taxonomies are data/config, not hardcoded branches.
- **Modular ingestion.** Each source is an adapter behind one interface; adding a source is adding a file, not editing a pipeline.
- **Evidence spine.** Every analytic write also writes `evidence` rows. No orphan claims.
- **Idempotent, incremental jobs.** Every batch job is safe to re-run; reviews dedup by content hash; snapshots are append-only.
- **Separation of concerns.** Ingestion → Storage → Extraction → Intelligence → Presentation are distinct stages with typed contracts between them.

## Technology stack & rationale
| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (Node 20+) | One language across dashboard, API, and workers; strong typing for the extraction contracts. |
| App / API / Dashboard | Next.js (App Router) | Dashboard + API routes in one deployable; first-class Vercel + Supabase support. |
| Datastore | Supabase (Postgres 15 + pgvector) | Normalized relational core *and* vector search in one DB; RLS; generated TS types. |
| Ingestion | Firecrawl | Market/listing discovery, structured extraction, crawling, change detection, scheduling. |
| AI extraction & synthesis | Anthropic Claude | Structured (tool-use/JSON) extraction with a cheap model; synthesis/reports with a strong model. |
| Embeddings | pgvector + embedding model | RAG retrieval over the review corpus, colocated with relational data. |
| Revenue enrichment (optional) | PriceLabs | Attaches market rate/occupancy context to ROI models and snapshots. |
| Validation | Zod | Runtime-validate every LLM output and external payload against the schema. |
| Testing | Vitest | Unit + integration; fixture-driven extraction tests. |
| Logging | Pino (structured JSON) | Correlated logs per crawl run / job; feeds monitoring hooks. |

## System diagram
```
                         ┌────────────────────────────────────────────┐
                         │                CONFIG                        │
                         │  markets.yaml · discovery-filters.yaml       │
                         │  taxonomy (categories, personas)             │
                         └───────────────┬──────────────────────────────┘
                                         │ markets:sync
                                         ▼
  ┌──────────────┐   Firecrawl    ┌───────────────┐   raw_pages    ┌─────────────────┐
  │ SOURCE       │───────────────▶│  INGESTION    │───────────────▶│  SUPABASE        │
  │ ADAPTERS     │  scrape/crawl  │  - discovery  │  dedup+hash    │  (Postgres +     │
  │ airbnb, vrbo,│                │  - listings   │                │   pgvector)      │
  │ booking,     │                │  - reviews    │◀───────────────│  listings,       │
  │ google,      │                │  - change det.│  incremental   │  reviews, ...    │
  │ reddit, ...  │                └──────┬────────┘                └────────┬─────────┘
  └──────────────┘                       │                                  │
                                         │ new reviews                      │
                                         ▼                                  │
                                ┌───────────────┐   extractions             │
                                │ AI PIPELINE   │──────────────────────────▶│
                                │ - extract     │   mentions, personas,     │
                                │ - classify    │   categories, delighters  │
                                │ - embed       │──────────────────────────▶│ review_embeddings
                                └───────────────┘                           │
                                                                            │
                    ┌───────────────────────────────────────────────────────┤
                    ▼                    ▼                    ▼              ▼
             ┌────────────┐      ┌──────────────┐    ┌──────────────┐  ┌──────────┐
             │ TREND      │      │ OPPORTUNITY  │    │ EXPECTATION  │  │ MARKET   │
             │ ENGINE     │      │ ENGINE       │    │ INDEX        │  │ COMPARE  │
             └─────┬──────┘      └──────┬───────┘    └──────┬───────┘  └────┬─────┘
                   └─────────────┬──────┴───────────────────┴───────────────┘
                                 ▼
                        ┌──────────────────┐   evidence[]     ┌──────────────────┐
                        │ RECOMMENDATION   │─────────────────▶│  MONTHLY REPORT  │
                        │ ENGINE (Top 25)  │                  │  GENERATOR       │
                        └────────┬─────────┘                  └────────┬─────────┘
                                 │                                     │
                                 ▼                                     ▼
                        ┌──────────────────────────────────────────────────────┐
                        │  NEXT.JS DASHBOARD + API  (RAG search, evidence browser,│
                        │  trends, recommendations, exports)                     │
                        └──────────────────────────────────────────────────────┘
```

## Module boundaries (`src/`)
```
src/
  lib/
    db/            Supabase client, generated types, query helpers
    config/        Loads + validates markets.yaml / discovery-filters.yaml (Zod)
    llm/           Anthropic client, prompt templates, JSON-schema tool defs
    firecrawl/     Firecrawl client wrapper: retry, rate limit, cache
    logging/       Pino setup, run correlation ids
  ingestion/
    adapters/      One module per source implementing SourceAdapter
    discovery.ts   Market → candidate listings (Firecrawl map/search)
    reviews.ts     Listing → reviews, with dedup + change detection
    pipeline.ts    Orchestrates a crawl_run
  ai/
    extract.ts     Review → structured extraction (validated)
    classify.ts    Persona + category assignment
    embed.ts       Chunk + embed reviews / insights
    schema.ts      Zod schemas mirroring review_extractions
  engines/
    trends.ts      Period-over-period diffs → trend_history
    opportunities.ts
    expectation-index.ts   table_stakes vs delight classification
    memorable.ts   Guest delighter library aggregation
    compare.ts     Cross-market comparison
    recommend.ts   Opportunities → ranked recommendations (+evidence)
  reports/
    generate.ts    Assembles MonthlyReport sections
    render.ts      HTML/PDF rendering
  jobs/            Thin CLI entrypoints wiring the above (see package.json scripts)
  app/             Next.js App Router: dashboard pages + /api routes
```

## The `SourceAdapter` contract
Every ingestion source implements the same interface so the pipeline is source-agnostic:
```ts
interface SourceAdapter {
  source: PlatformSource;
  discoverListings(market: Market, filters: DiscoveryFilters): Promise<CandidateListing[]>;
  fetchListing(listingRef: ListingRef): Promise<ListingSnapshot>;
  fetchReviews(listingRef: ListingRef, since?: Date): Promise<RawReview[]>;
  supportsChangeDetection: boolean;
}
```
Discovery vs. review-only sources (e.g. Reddit yields reviews/sentiment but no
listings) implement the subset they support; the pipeline checks capabilities.

## Data flow contracts
- **Ingestion → DB:** `RawReview` normalized, hashed (`content_hash`), inserted with `ON CONFLICT DO NOTHING`. Duplicates never re-enter.
- **DB → AI:** the extractor selects `reviews WHERE is_processed = false`, emits a `ReviewExtraction` validated by Zod against `ai/schema.ts`, writes `review_extractions` + mention rows in one transaction, flips `is_processed`.
- **AI → Engines:** engines read only from extraction/mention tables and snapshots; they never re-read raw review text except to quote evidence.
- **Engines → Presentation:** dashboard/report read materialized engine outputs; heavy aggregation happens in jobs, not on request.

## Scheduling & environments
- **Monthly pipeline** (`pipeline:monthly`) runs the full chain per market. Scheduled via Supabase cron / GitHub Actions / Vercel Cron (choice in Phase 3, see roadmap).
- **Incremental ingestion** can run more frequently; only new content is processed.
- Environments: local (Supabase local stack) → staging project → production project. Migrations are the source of truth; never hand-edit prod schema.

## Failure, retry, observability
- Firecrawl wrapper: token-bucket rate limit (`FIRECRAWL_MAX_RPS`), bounded concurrency, exponential backoff on 429/5xx, response cache keyed by URL+params, graceful partial-failure (a failed listing degrades that listing, not the run).
- Every job runs under a `crawl_run`/job id used as the Pino correlation id; counts (pages, reviews found/new) are persisted for monitoring.
- Monitoring hooks: job outcomes + Supabase advisors surfaced; alert on `status='failed'` or `reviews_new=0` anomalies.
