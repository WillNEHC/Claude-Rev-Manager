# `src/` — Application Code

Module layout per [`../docs/02-architecture.md`](../docs/02-architecture.md).
Built incrementally per [`../docs/10-roadmap.md`](../docs/10-roadmap.md).

## Implemented — Phase 1 (data spine + Airbnb ingestion slice)
```
src/
  lib/
    config/    Zod schemas + YAML loaders (markets, discovery filters), path resolver
    logging/   Pino structured logger with run correlation
    hash.ts    Content-hash dedup ("never duplicate reviews")
    firecrawl/ Client wrapper: rate limiting, retry+backoff, cache, graceful failure
    db/        IngestRepository interface, in-memory impl (tests), Supabase impl (live)
  ingestion/
    types.ts   SourceAdapter contract + domain types
    filter.ts  Discovery filtering (entire-home/luxury/family/pet/superhost)
    adapters/  airbnb.ts — pure parsers + Firecrawl-driven adapter
    pipeline.ts  Orchestrates a crawl run: discover → filter → upsert → dedup
  jobs/
    sync-markets.ts  markets:sync — reconcile config/markets.yaml → DB
    ingest.ts        ingest — run one market/source into Supabase
```

Run `npm run typecheck` and `npm test` (26 tests: config validation, dedup
hashing, discovery filtering, adapter parsing against fixtures, the Firecrawl
reliability layer, and the pipeline end-to-end incl. dedup-on-rerun and graceful
partial failure).

Live run (needs `SUPABASE_*` + `FIRECRAWL_API_KEY` in env, and migrations applied):
```
npm run markets:sync
npm run ingest -- squam-lake airbnb
```

## Implemented — Phase 2 (AI extraction + embeddings)
```
src/
  ai/
    schema.ts    Zod extraction contract (mirrors review_extractions + mentions)
    prompt.ts    Extraction system/user prompts with taxonomy hints
    extract.ts   LlmExtractor interface + AnthropicExtractor + JSON parsing
    embed.ts     chunkText + EmbeddingProvider (OpenAI) interface
    pipeline.ts  runExtraction (validate -> persist | quarantine) + runEmbedding
  lib/db/
    extraction-repository.ts           interface + in-memory impl
    supabase-extraction-repository.ts  live impl (slug resolution + fan-out)
  jobs/
    extract.ts   extract — process the unprocessed-review queue
    embed.ts     embed — chunk + embed reviews into pgvector
```
Migration `0006` adds the `extraction_failures` quarantine table and the
`reviews_needing_embedding` queue view. Extraction is one structured LLM pass;
invalid outputs are quarantined (never written). Live run:
```
npm run extract -- 200   # needs ANTHROPIC_API_KEY
npm run embed -- 200     # needs OPENAI_API_KEY
```

## Implemented — Phase 3 (intelligence engines + scheduling)
```
src/engines/
  types.ts            aggregate inputs + evidence-bearing outputs
  analytics.ts        AnalyticsSource interface + in-memory impl
  trends.ts           period-over-period diffs -> trend points
  expectation-index.ts  data-driven table_stakes vs delight
  opportunities.ts    amenity-gap detection with demand evidence
  compare.ts          per-market profile insights
  scoring.ts          config-weighted priority score
  recommend.ts        opportunities -> ranked recs + ROI + month-over-month history
  repository.ts       EngineRepository (enforces the evidence invariant) + in-memory
  pipeline.ts         runMonthlyPipeline (orchestrates all engines)
src/lib/db/
  supabase-analytics.ts          calls the SQL aggregation functions
  supabase-engine-repository.ts  persists trends/opps/insights/recs + evidence + history
src/jobs/monthly-pipeline.ts     the scheduled engine run
.github/workflows/monthly-intelligence.yml  monthly cron (ingest->extract->embed->engines)
```
Migration `0007` adds the `amenity_stats` / `category_stats` SQL aggregation
functions and a `rec_key` column for recommendation diffing. The evidence
invariant is structural: persisting an opportunity/insight/recommendation with
no evidence throws `MissingEvidenceError`. Live run:
```
npm run pipeline:monthly -- 2026-06-01   # needs SUPABASE_* 
```

## Implemented — Phase 4 (dashboard + RAG + reports)
```
src/rag/       router (structured/semantic/hybrid) · retriever iface + in-memory ·
               grounded synthesizer · answer pipeline (insufficient-evidence guard)
src/reports/   generate (section assembly + confidence summary) · render (HTML) · build (from DB)
src/api/       Zod-validated handlers + DashboardRepository iface + in-memory + search handler
src/lib/db/    supabase-retriever · supabase-dashboard-repository
src/app/       Next.js App Router: layout + Overview / Recommendations / Ask (RAG) /
               Evidence / Compare pages, and /api routes wrapping the tested handlers
```
The RAG pipeline refuses to answer from an empty well (returns "insufficient
evidence" without calling the LLM). The Next app builds cleanly (`npm run build`);
core logic is unit-tested (`npm test`), the app is typechecked separately
(`npm run typecheck:app`). Live run needs `npm install` then `npm run dev`
(requires SUPABASE_* + ANTHROPIC/OPENAI keys). Report export:
`GET /api/reports?market=squam-lake&month=2026-06-01`.

## Not yet built
- Additional adapters (Vrbo, Booking, Google, Reddit…) — Phase 5
