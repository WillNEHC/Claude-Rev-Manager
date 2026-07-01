# GDIP — Guest Demand Intelligence Platform

> Market-research intelligence for luxury short-term rentals on New Hampshire's lakes.
> Continuously discovers what guests value, why they travel, what drives five-star
> stays, and where owners can improve revenue, satisfaction, and asset value.

**Status:** Planning package (v1.0). This repository currently contains the full
architecture, database schema, and roadmap. Application code is built in phases —
see [`docs/10-roadmap.md`](docs/10-roadmap.md).

---

## What this is

GDIP is **not** a scraper. It is an evidence-first intelligence platform. Every
recommendation it produces carries a supporting review count, sample excerpts, a
confidence score, an implementation-cost estimate, expected guest impact, an ROI
classification, and the last observed trend. When evidence is weak, it says so.
When evidence contradicts an assumption, it surfaces the contradiction.

### V1 markets
Lake Winnipesaukee · Squam Lake · Newfound Lake · Lake Sunapee
*(Adding a market is a config edit — see [`config/markets.example.yaml`](config/markets.example.yaml).)*

### Core capabilities
- **Modular ingestion** of listings & reviews (Airbnb, Vrbo, Booking.com, Google, Reddit, forums, blogs) via Firecrawl, with dedup, incremental crawling, and change detection.
- **Structured AI extraction** of every review into amenities, personas, categories, sentiment, operational issues, delighters, and evidence-grade excerpts.
- **Intelligence engines:** Trend, Opportunity, Guest Expectation Index, Memorable Experience Library, Market Comparison, and a monthly Recommendation engine.
- **Natural-language search (RAG)** over the review corpus ("What do families complain about on Squam Lake?").
- **Monthly intelligence reports** with a Top-25 recommendation list and an evidence appendix.
- **Dashboard** for market/date/persona exploration, trends, semantic search, and evidence browsing.

## Tech stack
TypeScript end-to-end. Next.js (dashboard + API routes) · Supabase/Postgres +
pgvector · Anthropic Claude (extraction & synthesis) · Firecrawl (ingestion) ·
PriceLabs (optional revenue enrichment). Rationale in [`docs/02-architecture.md`](docs/02-architecture.md).

## Repository layout
```
config/                 Market definitions & discovery filters (config-driven behavior)
supabase/migrations/    Normalized schema, vectors, RLS, seed data (runnable SQL)
docs/                   Architecture, schema, pipeline, engines, roadmap, standards
src/                    (Build phase) Next.js app, ingestion adapters, jobs, AI pipeline
.env.example            Environment configuration template
```

## Documentation
| Doc | Contents |
|-----|----------|
| [01 — Overview](docs/01-overview.md) | Product philosophy, users, success criteria |
| [02 — Architecture](docs/02-architecture.md) | System diagram, stack, module boundaries |
| [03 — Database schema](docs/03-database-schema.md) | Entity model, tables, indexing, ERD |
| [04 — Ingestion](docs/04-ingestion.md) | Firecrawl pipeline, adapters, dedup, scheduling |
| [05 — AI pipeline](docs/05-ai-pipeline.md) | Extraction schema, personas, categorization |
| [06 — Intelligence engines](docs/06-intelligence-engines.md) | Trends, opportunities, expectation index, recs |
| [07 — Search & RAG](docs/07-search-rag.md) | Embeddings, retrieval, grounded answers |
| [08 — Dashboard](docs/08-dashboard.md) | Screens, filters, evidence browser |
| [09 — Reports](docs/09-reports.md) | Monthly report structure & generation |
| [10 — Roadmap](docs/10-roadmap.md) | Phased build plan & future enhancements |
| [11 — Evidence standards](docs/11-evidence-standards.md) | Confidence, citations, anti-bias rules |
| [12 — Cost & operations](docs/12-cost-and-operations.md) | Run-cost model, cost-control levers, guardrails |
| [13 — API surface](docs/13-api-surface.md) | Dashboard/API endpoint contract |
| [14 — Metrics & worked example](docs/14-metrics-and-worked-example.md) | Trend metric catalog + review→recommendation trace |
| [15 — Decisions & risks](docs/15-decisions-and-risks.md) | Decision log, open questions, risks (incl. ToS) |

A concrete extraction contract lives at [`docs/schemas/review-extraction.schema.json`](docs/schemas/review-extraction.schema.json).

## Testing & verification
- **Unit + integration:** `npm run typecheck && npm test` — 27 tests: config
  validation, dedup hashing, discovery filtering, Airbnb parsing against
  fixtures, the Firecrawl reliability layer, the pipeline end-to-end (dedup on
  re-run, graceful partial failure), and a real-adapter integration test driving
  `AirbnbAdapter` + `FirecrawlClient` + pipeline through a fixture transport.
- **Schema:** the 5 migrations have been applied to a real Postgres 16 + pgvector
  and verified (30 tables, 3 views, 76 indexes, seed data, the dedup constraint,
  the `match_reviews` RAG function, and every upsert's unique constraint). To
  re-verify against any Postgres: `DATABASE_URL=... ./scripts/apply-migrations.sh`.

## Getting started (planning-stage)
1. Read [`docs/01-overview.md`](docs/01-overview.md) then [`docs/02-architecture.md`](docs/02-architecture.md).
2. Review the schema in `supabase/migrations/` — it runs today against a fresh Supabase project.
3. Copy `.env.example` → `.env.local` and fill in Supabase/Firecrawl/Anthropic keys.
4. When ready to build, follow Phase 1 in [`docs/10-roadmap.md`](docs/10-roadmap.md).
