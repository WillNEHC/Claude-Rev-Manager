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

## Not yet built
- `engines/` — trends, opportunities, recommendations (Phase 3)
- `reports/`, `app/` (Next.js dashboard + API) — Phase 4
- Additional adapters (Vrbo, Booking, Google, Reddit…) — Phase 5
