# 10 — Build Roadmap

Phased so each phase ends with something usable and testable. Every phase adds
tests; nothing merges without them. The schema (already written) underpins all
phases.

## Phase 0 — Foundations ✅ (this planning package)
- Architecture, schema (runnable SQL), config model, evidence standard, roadmap.
- **Exit:** stakeholder can read the blueprint and the schema runs on a fresh
  Supabase project.

## Phase 1 — Data spine + one source (vertical slice)
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

## Phase 2 — AI extraction + embeddings
- `src/ai`: extraction (Claude tool-use + Zod validation), persona/category
  classification, chunk + embed.
- Job: `extract`, `embed`. Extraction state machine (`is_processed`).
- Golden-set fixtures + extraction tests (structural + key-field assertions).
- **Exit:** reviews flow into `review_extractions` + all mention tables + vectors;
  invalid outputs quarantined, not written.

## Phase 3 — Intelligence engines + scheduling
- `src/engines`: trends, expectation index, opportunities, market comparison,
  recommendations (+ evidence attachment, priority scoring, history).
- Jobs: `trends`, `recommend`, `monthly-pipeline`; wire the scheduler
  (Supabase cron / GitHub Actions / Vercel Cron — decide here).
- Tests: engine math on synthetic fixtures; evidence-linkage invariant (no
  analytic row without evidence).
- **Exit:** a full monthly pipeline run produces ranked, evidence-backed
  recommendations.

## Phase 4 — Dashboard + RAG + reports
- Next.js screens (Overview, Review/Amenity Explorer, Trends, Recommendations,
  Evidence Browser, Market Comparison, Monthly Comparison).
- RAG endpoint + question router; semantic search UI with evidence panel.
- Report generation + HTML/PDF render + exports.
- Integration tests across API routes; RAG grounding tests (answers cite retrieved
  context; "insufficient evidence" path).
- **Exit:** the operator can explore, ask questions, and export monthly reports.

## Phase 5 — Add remaining sources + harden
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
