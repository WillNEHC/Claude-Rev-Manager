# 10 — Build Roadmap

Phased so each phase ends with something usable and testable. Every phase adds
tests; nothing merges without them. The schema (already written) underpins all
phases.

## Phase 0 — Foundations ✅ (this planning package)
- Architecture, schema (runnable SQL), config model, evidence standard, roadmap.
- **Exit:** stakeholder can read the blueprint and the schema runs on a fresh
  Supabase project.

## Phase 1 — Data spine + one source (vertical slice) ✅
*Status: implemented. Config loaders, logging, dedup hashing, the Firecrawl
reliability wrapper, the `IngestRepository` (in-memory + Supabase), the Airbnb
adapter, the ingestion pipeline, and the `markets:sync` / `ingest` jobs are in
`src/`, with 26 passing tests and a clean typecheck. Deviation: the Next.js app
scaffold is deferred to Phase 4 (the dashboard phase) to keep this slice focused
on ingestion — the actual exit criterion.*

- Install dependencies; scaffold Next.js app + `src/` modules.
- `src/lib/db` (Supabase client + generated types), `src/lib/config` (Zod-validated
  loaders for markets.yaml / discovery-filters.yaml), `src/lib/logging` (Pino).
- Firecrawl wrapper (rate limit, retry, cache, graceful failure).
- **One adapter end-to-end (Airbnb):** discovery → filter → listings → reviews →
  dedup into Supabase.
- Jobs: `markets:sync`, `ingest`.
- Tests: config validation, dedup/hash correctness, adapter parsing against saved
  fixtures.
- **Exit:** real deduplicated listings + reviews for one market from one source.

## Phase 2 — AI extraction + embeddings ✅
*Status: implemented. `src/ai` (Zod contract, prompts, Anthropic extractor,
embedding provider, extract + embed pipelines), the extraction repository
(in-memory + Supabase), migration 0006 (extraction_failures quarantine +
reviews_needing_embedding view), and the extract/embed jobs are in place. 45
passing tests incl. schema validation against golden fixtures, quarantine of
invalid/errored output, mention fan-out, and idempotent embedding. Migrations
0001–0006 apply cleanly to real Postgres 16 + pgvector and the full write path
(extraction row + all mention tables + is_processed flip + pgvector embed +
queue view) verified end to end.*

- `src/ai`: extraction (Claude tool-use + Zod validation), persona/category
  classification, chunk + embed.
- Job: `extract`, `embed`. Extraction state machine (`is_processed`).
- Golden-set fixtures + extraction tests (structural + key-field assertions).
- **Exit:** reviews flow into `review_extractions` + all mention tables + vectors;
  invalid outputs quarantined, not written.

## Phase 3 — Intelligence engines + scheduling ✅
*Status: implemented. `src/engines` (trends, expectation index, opportunities,
market comparison, scoring, recommendations with priority + ROI + month-over-month
history, the orchestration pipeline, and the EngineRepository that enforces the
evidence invariant), the Supabase analytics source + engine repository, migration
0007 (amenity_stats/category_stats SQL functions + rec_key), the monthly-pipeline
job, and the GitHub Actions monthly scheduler. 64 passing tests incl. trend math,
expectation classification, opportunity detection, priority ordering, ROI, history
transitions, and the evidence-invariant guard. Migrations 0001–0007 apply to real
Postgres 16 + pgvector; the SQL aggregation functions and the full engine write
path (trends + opportunities + recommendations + evidence + history) verified end
to end. Scheduler decision (O2): GitHub Actions.*

- `src/engines`: trends, expectation index, opportunities, market comparison,
  recommendations (+ evidence attachment, priority scoring, history).
- Jobs: `trends`, `recommend`, `monthly-pipeline`; wire the scheduler
  (Supabase cron / GitHub Actions / Vercel Cron — decide here).
- Tests: engine math on synthetic fixtures; evidence-linkage invariant (no
  analytic row without evidence).
- **Exit:** a full monthly pipeline run produces ranked, evidence-backed
  recommendations.

## Phase 4 — Dashboard + RAG + reports ✅
*Status: implemented. `src/rag` (router, retriever, grounded synthesizer, answer
pipeline with the insufficient-evidence guard), `src/reports` (assembly + HTML
render + DB build), `src/api` (Zod-validated handlers + search handler), the
Supabase retriever + dashboard repository, and a Next.js App Router dashboard
(Overview, Recommendations, Ask/RAG, Evidence browser, Compare + API routes).
83 passing tests incl. question routing, RAG grounding + the insufficient-evidence
path (no LLM call on an empty well), report assembly/render/escaping, and API
param validation. Core typecheck clean, app typechecks separately, and
`next build` compiles all routes + pages. Remaining for live: browser verification
against real ingested data. Charts on the Trends screen are deferred (see
future roadmap).*

- Next.js screens (Overview, Review/Amenity Explorer, Trends, Recommendations,
  Evidence Browser, Market Comparison, Monthly Comparison).
- RAG endpoint + question router; semantic search UI with evidence panel.
- Report generation + HTML/PDF render + exports.
- Integration tests across API routes; RAG grounding tests (answers cite retrieved
  context; "insufficient evidence" path).
- **Exit:** the operator can explore, ask questions, and export monthly reports.

## Phase 5 — Add remaining sources + harden ✅
*Status: implemented. Vrbo + Booking.com adapters (shared helpers; Premier Host
and 0–10-score→superhost-equivalent mappings) wired into ingest/backfill;
monitoring (evaluateHealth + logger/webhook alert sinks + monitor job); PriceLabs
revenue enrichment (interface + provider + enrich job, enrichment-only);
backfill tooling (bounded drainQueue + backfill job with cost ceilings); and
migration 0008 (hot-path indexes, partial unique index for market snapshots, IVFFlat
reindex function). Scheduler ingests airbnb+vrbo+booking and runs enrich + monitor.
107 passing tests incl. new-adapter parsing, cross-source dedup, health rules,
webhook sink, enrichment mapping + run, and the bounded drainer. Migrations
0001–0008 apply to real Postgres 16 + pgvector; the partial unique index and
reindex function verified.
Remaining (future): review-only sources (Google/Reddit/forums) need a
market-level review path; live browser + end-to-end runs against real data.*

- Adapters: Vrbo, Booking.com, Google, Reddit, forums/blogs (each behind the same
  interface).
- PriceLabs enrichment into snapshots + ROI models.
- Monitoring hooks/alerts, backfill tooling, performance passes (index tuning,
  IVFFlat rebuild cadence).
- **Exit:** multi-source, multi-market, production-hardened.

## Testing strategy (all phases)
- **Unit:** parsing, hashing/dedup, config validation, engine math, priority
  scoring — deterministic, fixture-driven.
- **Extraction:** golden-set reviews with expected structured output.
- **Integration:** ingest→extract→engines→report against a seeded test DB
  (Supabase local / branch).
- **Invariant tests:** every recommendation/insight/trend row has ≥1 evidence row;
  no duplicate reviews by `(source, content_hash)`.

## Future enhancement roadmap
- Additional markets (config-only) beyond NH lakes; other regions/asset classes.
- Acquisition scoring: rank candidate properties by modeled review/revenue upside.
- Owner portal: per-owner briefs + tracked recommendation adoption/outcomes.
- Photo/listing-copy analysis (vision) alongside review text.
- Price-elasticity modeling blending PriceLabs + review-derived demand signal.
- Alerting on emerging complaints before they dent ratings.
- Feedback loop: track which recommendations were implemented and their measured
  effect, closing the loop from advice → outcome → better future scoring.
- Fine-tuned/cheaper extraction as volume grows; embedding-model upgrades.
