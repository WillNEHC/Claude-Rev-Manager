# 14 — Metrics Catalog & Worked Example

Concrete `metric_key`s for the Trend engine and one end-to-end trace of a single
review becoming an evidence-backed recommendation — so the abstract pipeline is
legible.

## Trend metric_key catalog
`trend_history.metric_key` is a dotted path: `entity.slug.measure`. Stable set:

| Pattern | Example | Meaning |
|---|---|---|
| `amenity.<slug>.mention_rate` | `amenity.fire_pit.mention_rate` | Share of reviews mentioning the amenity. |
| `amenity.<slug>.positive_rate` | `amenity.hot_tub.positive_rate` | Positive share among its mentions. |
| `amenity.<slug>.negative_on_absence` | `amenity.fast_wifi.negative_on_absence` | Complaint rate tied to its absence (Expectation Index input). |
| `category.<slug>.negative_rate` | `category.cleanliness.negative_rate` | Negative share within a category. |
| `category.<slug>.volume` | `category.outdoor_experience.volume` | Mention volume. |
| `persona.<slug>.share` | `persona.remote_workers.share` | Share of reviews classified to a persona. |
| `place.<type>.<name>.mentions` | `place.restaurant.canoe_club.mentions` | Mentions of a specific local business. |
| `ops.<issue_type>.rate` | `ops.wifi_down.rate` | Operational-issue incidence. |
| `delighter.<type>.rate` | `delighter.welcome_basket.rate` | Delighter frequency. |
| `market.rating.avg` | `market.rating.avg` | Market average rating. |
| `market.review.volume` | `market.review.volume` | New-review volume. |

Each row carries `value`, `prev_value`, `delta`, `delta_pct`, `direction`, and
`sample_size`. Low `sample_size` ⇒ low-confidence, flagged not hidden.

## Priority score (worked)
```
priority = 0.30·confidence
         + 0.25·expected_guest_impact
         + 0.20·normalized(expected_revenue_impact)
         − 0.15·difficulty_penalty
         − 0.10·cost_penalty
         + 0.10·trend_momentum
```
Weights live in config so the operator can bias toward quick wins vs. capex bets.

## End-to-end trace: one review → one recommendation

**1. Ingest.** Firecrawl fetches a Squam Lake listing's reviews. A review:
> *"Beautiful home and the dock was perfect for the kids. Only wish there'd been a fire pit for evenings — we saw one at a place on Winni last year and the kids loved s'mores."*
Normalized, hashed, inserted into `reviews` (`is_processed=false`). Duplicate on
re-crawl → `ON CONFLICT DO NOTHING`, never re-counted.

**2. Extract (Haiku 4.5, validated).** Emits a `review_extractions` row and mentions:
- `personas`: `families` (0.95), `boating_groups` (0.6)
- `amenity_mentions`: `private_dock` (positive, 0.9, excerpt "dock was perfect for the kids"); `fire_pit` (negative/absence, 0.85, excerpt "wish there'd been a fire pit")
- `guest_delighters`: none present, but `s'mores`/`fire_pit` desire noted
- `categories`: `outdoor_experience` (positive), `family_experience` (positive)
- `is_exceptional=false`, `has_unexpected_delight=false`

**3. Aggregate + trend.** Across Squam this month, `amenity.fire_pit.mention_rate`
and `amenity.fire_pit.negative_on_absence` both rise; sample_size = 18 reviews
wishing for a fire pit. `trend_history` records direction `up`.

**4. Expectation Index.** `fire_pit` scores high positive-on-presence (from
markets that have it) + rising absence-complaints → classified `delight` with
0.82 confidence; `amenities.classification` updated, evidence attached.

**5. Opportunity.** Cross-market comparison shows fire pits common on
Winnipesaukee, rare on Squam, with a family-persona desire signal → an
`opportunities` row: amenity gap, est. cost $600–1,500, difficulty `easy`,
expected review impact +0.15, confidence 0.8, supporting_review_count 18.

**6. Recommendation.** Promoted to a `recommendations` row:
- **Title:** "Add a fire pit + s'mores kit to Squam family listings"
- **Owner explanation:** "18 reviews this quarter wished for a fire pit; families specifically tie it to s'mores with kids. Comparable Winnipesaukee listings with fire pits average 0.15 higher ratings."
- **Operator explanation:** "Install a code-compliant fire pit ($600–1,500), stock a reusable s'mores kit; check town burn regulations."
- confidence 0.8 · implementation_cost ~$1,000 · roi_class `high` · difficulty `easy` · expected_guest_impact "+0.15 rating, strong family appeal" · priority_score computed above · last_observed_trend "rising 3 months"
- **evidence:** the 18 reviews + their excerpts, weighted.

**7. Report + dashboard.** Appears in the Squam monthly report's Top-25 and on the
Recommendation Dashboard. Clicking it opens the Evidence Browser showing all 18
citations. Next month, `recommendation_history` marks it `strengthened` if the
signal grows — or `weakened` if it fades. The operator can always answer "why,
based on what, how sure?"

## Contradiction handling (worked)
If 5 of those 18 reviews *also* said the yard was too small for a fire pit, the
Opportunity engine surfaces both sides, lowers confidence (e.g. 0.8 → 0.62), and
the recommendation's owner explanation notes the caveat rather than hiding it —
per [`11-evidence-standards.md`](11-evidence-standards.md).
