# 16 — Data Sourcing (ToS-Clean Strategy)

The platform's value depends on review/sentiment data. This doc defines **where
that data comes from**, chosen to avoid violating any platform's Terms of Service
— because a tool built on ToS-violating scraping is both legally exposed and
technically fragile (platforms block scrapers and change their pages).

## The rule
**We do not run automated scraping of competitor listing pages** (Airbnb, Vrbo,
Booking.com). Those adapters remain in the codebase but are **off by default** and
require an explicit, informed operator decision to enable (see `docs/15` R1).

## Approved sources (default intake)

### 1. Your own guest reviews — the best fuel
The operator runs an STR management business and **owns** their guests' reviews
(via their host accounts / PMS exports). Importing your own reviews is fully
legitimate and the highest-signal data available. *(Import path: CSV/PMS — planned;
these flow into the same `reviews` table with the real source, e.g. `airbnb`,
since they're your own listings' reviews.)*

### 2. Public web research — implemented
Reading **public** web pages for market research is legitimate. The web-research
ingestion (`src/ingestion/research/`) gathers public documents — blogs, Reddit,
TripAdvisor forums, destination sites, Google results — via the configured search
provider (Firecrawl) and stores them as **market-level** review evidence
(listing-less, `source` classified by domain: `reddit`, `forum`, `blog`,
`destination_site`, `google`, `other`). The same AI extraction pipeline then
pulls amenities, personas, complaints, and delighters from that text.

Run: `npm run research -- <market-slug>` (needs `FIRECRAWL_API_KEY`).

### 3. PriceLabs — market economics
PriceLabs (already connected) supplies market rate/occupancy/amenity-demand
signal, folded into snapshots + ROI models via the enrichment path (`docs/06`,
Phase 5).

## Why this is stronger, not weaker
- **Legal**: no ToS violation; defensible as market research over public content + owned data.
- **Durable**: public web + your own exports don't break when a competitor restyles a listing page.
- **Honest**: still evidence-first — every insight cites the public source or your own review it came from.

## Recommended monthly intake
1. Import your own guest reviews (highest signal).
2. `research` over public web per market (breadth of market sentiment).
3. PriceLabs enrichment (economics).
4. → extract → engines → the "what are guests looking for in X" answer.

Direct competitor-listing scraping is available but disabled by default and is
the operator's call to make with eyes open.
