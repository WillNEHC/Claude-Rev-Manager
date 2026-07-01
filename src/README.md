# `src/` — Application Code (build phase)

This directory is intentionally a stub during the planning phase. The module
layout below is the agreed target from [`../docs/02-architecture.md`](../docs/02-architecture.md);
implementation lands per [`../docs/10-roadmap.md`](../docs/10-roadmap.md), starting
with Phase 1 (data spine + Airbnb adapter).

```
src/
  lib/        db · config · llm · firecrawl · logging   (shared infrastructure)
  ingestion/  adapters/ · discovery · reviews · pipeline (Firecrawl → Supabase)
  ai/         extract · classify · embed · schema        (review → structured)
  engines/    trends · opportunities · expectation-index · memorable · compare · recommend
  reports/    generate · render                          (monthly report)
  jobs/       CLI entrypoints (see package.json scripts)
  app/        Next.js App Router: dashboard pages + /api routes
```

Nothing here is wired yet — the runnable artifacts today are the SQL migrations
in `../supabase/migrations/` and the config in `../config/`.
