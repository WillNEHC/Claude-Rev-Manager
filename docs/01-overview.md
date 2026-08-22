# 01 — Overview & Product Philosophy

## Objective
Build a production-quality Guest Demand Intelligence Platform (GDIP) for the
luxury short-term-rental (STR) market on New Hampshire's lakes. GDIP is the
primary market-research tool for an STR management business: it continuously
discovers what guests value, why they travel, what creates unforgettable stays,
what drives five-star reviews, and where owners can improve revenue, guest
satisfaction, and long-term asset value.

This is an **intelligence platform**, not a scraper. Scraping is one input.

## Primary user
One power user (the operator). The product optimizes for **decision support**:
- Deep market intelligence
- Owner consulting
- Property acquisitions
- Revenue optimization
- Amenity planning
- Guest-experience optimization
- Market-trend forecasting

There is no multi-tenant requirement in V1. The architecture keeps the door open
(Row-Level Security is enabled) but does not pay a complexity tax for it now.

## Core philosophy — evidence or it didn't happen
Every recommendation is evidence-backed. GDIP never recommends something because
it "sounds good." Each recommendation carries:

- Supporting review count
- Supporting listings
- Confidence score
- Sample review excerpts
- Estimated implementation cost
- Expected guest impact
- ROI classification
- Last observed trend

Three non-negotiable behaviors, enforced structurally (see
[`11-evidence-standards.md`](11-evidence-standards.md)):
1. **Weak evidence is labeled weak.** Low sample size / low confidence is shown, never hidden.
2. **Contradictions are surfaced,** not smoothed over.
3. **No bias reinforcement.** The system does not tell the operator what they want to hear.

The schema makes this real: analytic objects (recommendations, insights,
opportunities, trend points) cannot stand without rows in the `evidence` table
pointing back to concrete reviews and excerpts.

## Primary markets (V1)
Lake Winnipesaukee, Squam Lake, Newfound Lake, Lake Sunapee. Expansion to new
markets is a configuration change (`config/markets.yaml` → `markets:sync`), never
a code rewrite.

## Success criteria
The finished platform lets the operator answer:
- Why are guests choosing this market?
- What creates unforgettable stays?
- What amenities actually matter (vs. table stakes)?
- What operational issues are hurting reviews?
- What trends are emerging?
- What improvements have the highest ROI?
- What are competitors doing better?
- What should I recommend to owners this month?
- How are guest expectations changing?
- Where should I invest next?

## Value compounding
GDIP is designed to get more valuable over time. Reviews are ingested
incrementally and never duplicated; historical snapshots are preserved
indefinitely. The longer it runs, the richer the trend and comparison analytics
become — month-over-month, season-over-season, year-over-year.

## Non-goals (V1)
- Not a booking engine or PMS. It *reads* market signal; it does not manage reservations.
- Not a public product. Single internal operator; no billing, no onboarding flows.
- Not a real-time system. Cadence is monthly with incremental updates; nothing requires sub-minute latency.
