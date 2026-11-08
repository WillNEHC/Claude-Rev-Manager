# Revenue & Pricing Department

**Mission:** earn the most revenue per home without hurting reviews, by catching
pricing mistakes early and backing every change with data.

**Analogy:** PriceLabs is the autopilot. This department is the pilot who checks
the instruments every week, and asks the captain (Will) before touching the controls.

## Live listings in scope (verified 2026-11-08 — PriceLabs sync ON)

| Listing | City | BR | PriceLabs ID |
| --- | --- | --- | --- |
| Townhome w/ Sauna | Manchester, NH | 4 | 912900 |
| 183 Flagstone | Nashua, NH | 3 | 1145414 |
| Strolling Woods (Webster Lake estate) | Franklin, NH | 8 | 242377c7-… |
| Modern 3BR/2BA — 3 min to Okemo | Ludlow, VT | 3 | 8e787b69-… |
| 3BR/2BA Near Okemo — Mountain Getaway | Ludlow, VT | 3 | 82016dab-… |
| Cozy 6BR/4BA Near Okemo (likely the two 3BRs combined — to confirm) | Ludlow, VT | 6 | 5cf03c9c-… |
| 44 Maywood | Worcester, MA | 3 | ba59e74c-… |

12 other PriceLabs listings have sync OFF and are out of scope until Will
confirms which are active vs. old.

## Weekly routine (Monday)

1. **Pull** from PriceLabs: listing settings (`get_listing_data`), health
   (`get_listing_health_and_recommendations`), 12-month + forward bookings
   (`get_bookings_report`), 90–150 day price calendars (`get_listing_prices`),
   and comp-set prices (`get_neighbourhood_data`) for any listing that is flagged.
2. **Scan** each calendar with the department tool:
   `npx tsx src/jobs/revenue-scan.ts <prices.json> <min> <base> <max> "<name>"`
   It flags: min-price floor nights, max-price ceiling nights, unbookable gaps,
   peak-week fill, and month-by-month open/booked/blocked.
3. **Cross-check** every PriceLabs suggestion against comps. PriceLabs' own tips
   can contradict its market data (see `learnings.md`); comps win.
4. **Write** `reports/YYYY-MM-DD.md`: numbered recommendations, each with
   current value → proposed value, the evidence, and the risk.
5. **Post** the summary to Slack and wait for approval. Will replies with the
   numbers he approves (e.g. "approve R1, R3"). Nothing changes until then.
6. **Apply** approved changes in PriceLabs, then **log** them in the report.
7. **Learn:** add anything the run taught us to `learnings.md`, and upgrade the
   scanner when a new kind of problem shows up.

## Approval rules

- Every change to base / min / max price, min stay, discounts, or date overrides needs Will's OK.
- Recommendations without data behind them are not allowed.
- When PriceLabs' algorithm and real comps disagree, say so and show both.
