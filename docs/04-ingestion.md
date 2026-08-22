# 04 — Ingestion Pipeline (Firecrawl)

## Goal
Turn configured markets into a deduplicated, incrementally-updated corpus of
listings and reviews across many sources, with change detection and graceful
failure. Firecrawl is the crawling substrate; adapters normalize each source.

## Sources
**Vacation-rental platforms** (listings + reviews): Airbnb, Vrbo, Booking.com.
**Review / signal sources** (reviews/sentiment, often no listings): Google
Reviews, Reddit, local forums, travel blogs, destination sites, attraction /
restaurant / event reviews.

Each is a module under `src/ingestion/adapters/` implementing `SourceAdapter`
(see [`02-architecture.md`](02-architecture.md)). Adding a source = adding a file
and enabling it in a market's `sources` list. Nothing else changes.

## Pipeline stages
```
markets.yaml ─▶ [1 discovery] ─▶ candidate listings ─▶ [2 filter] ─▶ listings
                                                                        │
                                                        [3 listing snapshot]
                                                                        │
                                                        [4 review fetch] ─▶ dedup ─▶ reviews
                                                                        │
                                                            [5 place extraction]
```

### 1. Market & listing discovery
- For each market, use the seed `search_terms` + geographic radius with Firecrawl
  `search`/`map` to enumerate candidate listing URLs per source.
- `firecrawl_extract` pulls structured listing attributes (type, bedrooms, rate,
  rating, review_count, amenities, superhost badge, lat/lng).

### 2. Discovery filtering (config-driven)
- Apply `config/discovery-filters.yaml`. Derive the boolean flags
  (`is_entire_home`, `is_luxury`, `is_family_oriented`, `is_pet_friendly`,
  superhost) from scraped data via the declared heuristics.
- `match_mode: all | most | any` decides inclusion. Only qualifying listings are
  persisted; the rest are logged and skipped. Filters are fully configurable and
  per-market overridable.

### 3. Listing snapshot
- Upsert `listings` (`ON CONFLICT (platform, platform_listing_id)`), refresh
  `last_seen_at`, and write a `monthly_snapshots` row (append-only) capturing
  rate/rating/review_count for that month. Optional PriceLabs enrichment adds
  occupancy/market-rate context.

### 4. Review fetch — dedup & incremental
- Fetch reviews within the history window (`GDIP_HISTORY_WINDOW_MONTHS`, default 12).
- **Dedup:** compute `content_hash = sha256(normalize(source + author + date + body))`.
  Insert with `ON CONFLICT (source, content_hash) DO NOTHING`. A review is stored
  exactly once, forever. `crawl_runs.reviews_new` counts only genuine inserts.
- **Incremental:** on subsequent runs, `fetchReviews(listingRef, since)` limits
  work; adapters that support it stop paginating once they reach known content.
- **Change detection:** `raw_pages(url, content_hash)` uniqueness lets the
  pipeline skip re-processing unchanged pages entirely.

### 5. Place extraction
- Restaurant/brewery/attraction/event names surfaced during review extraction
  (see [`05-ai-pipeline.md`](05-ai-pipeline.md)) are resolved against
  `local_businesses` (trigram match on name within market) or created, and
  `place_mentions` rows are written. Mention counts and avg sentiment roll up.

## Firecrawl client wrapper (`src/lib/firecrawl/`)
Non-negotiable reliability features:
- **Rate limiting** — token bucket at `FIRECRAWL_MAX_RPS`; bounded concurrency at `FIRECRAWL_MAX_CONCURRENCY`.
- **Retry** — exponential backoff with jitter on 429/5xx (cap attempts); respect `Retry-After`.
- **Caching** — response cache keyed by `url + params`; a cache TTL avoids re-fetching within a run and across dev iterations (`data/cache/`, gitignored).
- **Graceful failure** — a single listing/page failure degrades that item and is recorded; the `crawl_run` completes as `partial` rather than aborting.
- **Structured logging** — every request carries the `crawl_run` id; counts persisted for monitoring.

## Scheduling
- **Monthly full pass** per market via `pipeline:monthly`.
- **Incremental** ingestion can run weekly/daily; only new content is fetched and processed.
- Firecrawl crawl scheduling / monitors may be used for change-heavy sources.
- Orchestration mechanism (Supabase cron vs. GitHub Actions vs. Vercel Cron) is
  finalized in Phase 3 — the jobs themselves are plain CLI entrypoints so the
  scheduler is swappable.

## Idempotency & safety
Every stage is safe to re-run: discovery upserts, reviews dedup, snapshots are
keyed by `(month, market, listing)`. A crashed run can simply be restarted; no
duplicate data results. Raw payloads are retained for reproducibility and audit.

## Legal / ToS note
Source platforms have terms of service and rate expectations. Ingestion must
respect robots directives and rate limits, prefer official/permitted access
where available, and keep volumes modest. This is called out here so it is a
deliberate operational decision, configured per source, not an afterthought.
