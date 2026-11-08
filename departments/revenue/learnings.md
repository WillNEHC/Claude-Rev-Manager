# Revenue Dept — Learnings log

Each run adds what it taught us. Tool upgrades come from here.

## 2026-11-08 (run #1)

- **Max-price ceilings hide the biggest money.** The first scanner only looked at
  min-price floors. The Okemo calendars showed the opposite problem on the most
  valuable nights (holidays/ski weeks): our max prices were far below what both
  the PriceLabs model and the comp set pay. → Added max-price ceiling detection.
- **PriceLabs' "no bookings" tool can point the wrong way.** For the Okemo
  Getaway it said "reduce your maximum price" because the listing hits max on 20
  of the next 61 days. The comp set says the opposite: on peak dates our $450 is
  below the market's 25th percentile ($664–$753). Rule: always check comps.
- **Cheap but unbooked ≠ price problem.** A listing priced under most of the
  market that still gets zero bookings likely has a visibility/setup issue
  (new with no reviews, not published, calendar sync). Check that before cutting price.
- **PriceLabs "occupancy" includes blocked nights.** The health card showed the
  6BR at 25% November occupancy with zero reservations — those were blocks.
  Use the bookings report for real occupancy.
- **Same coordinates = possible combo listing.** The 6BR shares exact
  coordinates with both Okemo 3BRs, and its blocks line up night-for-night with
  the Modern 3BR's bookings. Linked listings must be priced as a set.
- **`rental_revenue` in the bookings report excludes cleaning/extra fees**
  (those are in `extra_charges`). Report both, and say which one you mean.
