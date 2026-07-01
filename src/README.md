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

## Not yet built
- `ai/` — extraction, classification, embeddings (Phase 2)
- `engines/` — trends, opportunities, recommendations (Phase 3)
- `reports/`, `app/` (Next.js dashboard + API) — Phase 4
- Additional adapters (Vrbo, Booking, Google, Reddit…) — Phase 5
