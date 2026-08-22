# 08 — Dashboard

A clean, single-operator dashboard (Next.js App Router). Every view is
evidence-first: numbers are clickable through to the reviews behind them.

## Global controls (persistent header)
- **Market selector** — Winnipesaukee / Squam / Newfound / Sunapee / All.
- **Date selector** — month, season, or custom range; drives period-over-period.
- **Filters** — persona, category, source, rating, discovery flags (luxury/family/pet), amenity classification.

## Screens
1. **Overview** — market health at a glance: review volume, rating trend, top
   rising/declining signals, this month's Top-5 recommendations, active
   operational watch-list. Entry point to everything.

2. **Review Explorer** — searchable, filterable review table. Each row shows
   extracted tags (personas, categories, sentiment, delighters, issues). Click a
   review to see its full extraction and the excerpts that fed each mention.

3. **Amenity Explorer** — every amenity with its Guest Expectation classification
   (table stakes vs delight), prevalence, positive/negative mention rates, trend
   arrow, and evidence. Filter to "delighters trending up" or "table stakes with
   rising complaints."

4. **Trend Charts** — time series from `trend_history`: emerging/declining
   amenities, complaint trends, persona shifts, restaurant/attraction momentum.
   Month/season/year toggles. Low-sample points visually de-emphasized.

5. **Recommendation Dashboard** — the ranked Top-25 with every field (confidence,
   cost, ROI class, difficulty, guest/revenue impact, priority score, owner &
   operator explanations, last observed trend). Sort/filter by ROI, cost,
   difficulty, market. Month-over-month status badges (new/persisted/strengthened/
   weakened/retired).

6. **Semantic Search** — the natural-language question box (see
   [`07-search-rag.md`](07-search-rag.md)). Answer on the left, evidence panel of
   clickable excerpts on the right. Confidence and supporting count always shown.

7. **Evidence Browser** — reverse lookup: pick any conclusion (recommendation,
   insight, trend point, amenity classification) and see every review + excerpt
   supporting it, with weights. This is the trust surface of the whole platform.

8. **Market Comparison** — side-by-side across the four lakes: traveler mix,
   expectations, top amenities, complaints, restaurants, trip purposes,
   seasonality. Answers "why choose X over Y."

9. **Monthly Comparison / Reports** — browse generated monthly reports; diff this
   month vs last; export.

## Export options
- Monthly report → PDF / HTML (see [`09-reports.md`](09-reports.md)).
- Any table/chart → CSV.
- Recommendation set → shareable owner-facing brief.

## Design principles
- **Evidence is one click away everywhere.** No number is a dead end.
- **Confidence is always visible.** Low-confidence items are styled as such, never
  hidden or dressed up.
- **Read-heavy, write-light.** The dashboard reads materialized engine outputs;
  it does not trigger heavy computation on request (that's the monthly pipeline).
- **Fast defaults.** Sensible default market/date so the Overview is useful on load.

## Data access
Dashboard reads via the Supabase anon key under RLS (read-only for authenticated
users). All writes and heavy jobs use the service-role key server-side. API routes
in `src/app/api/` wrap the RAG endpoint and any export/render actions.
