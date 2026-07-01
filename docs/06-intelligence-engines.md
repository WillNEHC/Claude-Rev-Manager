# 06 — Intelligence Engines

The engines turn extracted signal into decisions. Each reads from extraction /
mention / snapshot tables, writes materialized outputs, and **attaches evidence
rows** to everything it emits. They run in the monthly pipeline after extraction.

---

## Trend Engine → `trend_history`
Compares periods: month-vs-month, season-vs-season, year-vs-year (as data
accumulates). For each tracked `metric_key` (e.g. `amenity.fire_pit.mention_rate`,
`category.cleanliness.negative_rate`, `persona.remote_workers.share`) it computes
value, prev_value, delta, delta_pct, direction (`up`/`down`/`flat`/`new`), and
sample_size.

Detects: emerging amenities, declining amenities, emerging complaints, new
attractions, restaurant trends, traveler shifts, pricing-related comments,
changing experience expectations, operational pain points.

Guardrail: a trend with small `sample_size` is emitted but labeled low-confidence
so the dashboard/report never presents noise as a movement.

---

## Guest Expectation Index → updates `amenities.classification`
Data-driven separation of **table stakes** vs **delight** amenities:
- **Table stakes** — expected; their *absence* generates complaints but presence
  is rarely praised (e.g. fast Wi-Fi, smart locks, stocked kitchen). Signature:
  high negative-on-absence, low positive-on-presence, high prevalence.
- **Delight** — experience amplifiers; presence generates disproportionate praise
  and memorable-moment mentions (e.g. fire pit, s'mores kit, paddleboards, local
  gifts, personalized notes, dog welcome kits, curated guides).

Method: for each amenity, compute prevalence, positive-mention rate, negative-on-
absence rate, and co-occurrence with `is_exceptional` / `guest_delighters`.
Classify with confidence; store `classification` + `classification_confidence`;
attach evidence. Because expectations shift, this is recomputed monthly — today's
delighter becomes tomorrow's table stake, and the Trend Engine captures the drift.

---

## Memorable Experience Library → `guest_delighters` (aggregated)
A searchable library of extraordinary guest experiences: birthday/anniversary
touches, wedding accommodations, welcome baskets, family game nights, fishing
gear, rainy-day guides, special host interactions, etc. Each delighter type is
tagged with frequency and evidence excerpts, embedded for semantic retrieval, and
surfaced in reports as concrete, copyable ideas — each provably observed, not
invented.

---

## Opportunity Engine → `opportunities`
Detects gaps: market, amenity, service, experience, operational, luxury, family,
pet. Signals include: high complaint rate in a category with no offsetting
amenity; a delighter common in one market but absent in another; unmet persona
needs (e.g. remote workers citing poor Wi-Fi/workspace).

For every opportunity it estimates: cost, difficulty, expected review impact,
expected revenue impact, confidence, and supporting review count — with evidence.
Revenue/impact estimates use review-signal models optionally blended with
PriceLabs market rate/occupancy data. Estimates are labeled as estimates.

---

## Market Comparison Engine → `market_insights`
Compares Winnipesaukee / Squam / Newfound / Sunapee across: traveler mix, guest
expectations, top amenities, complaint patterns, restaurant mentions, trip
purposes, luxury expectations, family preferences, pet expectations, seasonality.
Powers questions like "Why do guests choose Winnipesaukee over Newfound?" by
contrasting each market's `reasons_for_booking` distributions with evidence.

---

## Recommendation Engine → `recommendations` (+ `recommendation_history`)
Promotes the strongest opportunities into the monthly deliverable. Each
recommendation carries every mandated field:
title · evidence · supporting review count · supporting listings · confidence ·
implementation cost · ROI estimate · difficulty · expected guest impact ·
expected revenue impact · **priority score** · owner explanation · operator
explanation · last observed trend.

**Priority score** (ranking key for the Top-25) blends:
```
priority = w1·confidence
         + w2·expected_guest_impact
         + w3·normalized(expected_revenue_impact)
         − w4·difficulty_penalty
         − w5·cost_penalty
         + w6·trend_momentum        # rising issues/opportunities rank higher
```
Weights live in config so the operator can retune (e.g. bias toward low-cost
quick wins vs. capex bets).

**Continuity:** `recommendation_history` records how each recommendation changes
month-over-month (new / persisted / strengthened / weakened / retired) so the
report shows movement, not a fresh disconnected list each cycle.

**Anti-bias:** the engine must surface contradictory evidence (see
[`11-evidence-standards.md`](11-evidence-standards.md)). If reviews disagree about
whether an amenity matters, both sides appear and confidence is lowered — the
engine never manufactures a clean story.

---

## Owner & operator explanations
Every recommendation renders two audiences:
- **Owner explanation** — plain-English business case ("Guests repeatedly wished
  for a dock; 18 reviews mention it, comparable docked listings rate 0.3 higher").
- **Operator explanation** — how to execute ("Install seasonal dock, ~$X, permit
  lead time, vendor options"), for the management team.
