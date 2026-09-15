# Revenue Review — 15 September 2026
Source: PriceLabs bookings (Hospitable/`smartbnb`), three active properties only. Historical
listings excluded. Computed deterministically by `scripts/revenue_metrics.py` — no AI in the math.

> ⚠️ **Revenue caveat.** Figures are PriceLabs `rental_revenue`. Whether that is **gross or net of
> the OTA fee is still unverified** (`registry/contract-terms.yaml`). On Airbnb that is a 15.5%
> swing. Occupancy, pacing, channel mix and trend are unaffected and reliable. **Do not use the
> dollar figures for an owner payout until the gross/net question is settled.**

## Portfolio — Dec 2025 to mid-Sep 2026

| | |
|---|---|
| Rental revenue | **$123,098** |
| Nights sold | **381** of 556 available |
| Occupancy | **69%** |
| RevPAR | **$221** |

| Month | Nights | Occ | Revenue | RevPAR |
|---|---|---|---|---|
| Jan 2026 | 28/54 | 52% | $7,651 | $142 |
| Feb | 28/71 | 39% | $9,568 | $135 |
| Mar | 46/62 | 74% | $11,189 | $180 |
| Apr | 43/60 | 72% | $10,819 | $180 |
| May | 41/62 | 66% | $13,482 | $217 |
| **Jun** | 50/60 | **83%** | $19,129 | $319 |
| **Jul** | 53/62 | **85%** | $19,501 | $315 |
| **Aug** | 48/62 | **77%** | $18,113 | $292 |
| Sep (partial) | 41/60 | 68% | $12,706 | $212 |

Summer performs. Jun–Aug delivered **$56,743 — 46% of the year's revenue in three months.**

## By property

| | 183 Flagstone (3BR) | 672 Amory (4BR) | 61 Pleasant, Ludlow (3BR) |
|---|---|---|---|
| Completed stays | 45 | 40 | 2 |
| Nights sold | 169 | 182 | 5 |
| Revenue | $47,656 | **$64,552** | $2,894 |
| ADR | $282 | **$355** | $579 |
| Avg length of stay | 3.8 nts | 4.5 nts | 2.5 nts |
| Avg booking lead time | 31 days | 45 days | 6 days |
| Best month | Aug — 90% occ | Jul — 94% occ | Feb — 33% occ |

**Amory is the stronger asset** — 26% more revenue on 8% more nights, and a $73 higher ADR. Its
August ADR hit **$490** against Flagstone's $297. Forward Amory ADR is holding $487–$504.

Ludlow's $579 ADR is real but rests on 5 nights. Treat it as indicative, not proven.

---

## The five things that matter

### 🔴 1. Seven renovation nights at Amory are open and sellable — the first is 7 days away
Kyle told Melissa on 24 Aug that stair/carpet work runs **22–24 Sep** and second-floor vinyl
**28 Sep – 1 Oct**, and moved the cleans. **Those nights were never blocked on the calendar.**

```
Tue 22 Sep  open   <-- RENOVATION      Mon 28 Sep  open   <-- RENOVATION
Wed 23 Sep  open   <-- RENOVATION      Tue 29 Sep  open   <-- RENOVATION
Thu 24 Sep  open   <-- RENOVATION      Wed 30 Sep  open   <-- RENOVATION
                                       Thu 01 Oct  open   <-- RENOVATION
```
No booking clashes **yet**. Amory's average lead time is 45 days, but it has taken same-week
bookings before. A guest can book into an active construction zone tonight.

**Action: block those 7 nights today.** This is the only item here that is urgent rather than
important. *(Blocking is a PriceLabs/Hospitable calendar write — `HUMAN APPROVAL REQUIRED` under
the current rules, so I have not done it.)*

### 🔴 2. November is nearly empty, and the booking window is closing now
| | Flagstone | Amory | Combined |
|---|---|---|---|
| Nights booked | 4 / 30 | 3 / 30 | **7 / 60 — 12%** |
| Revenue on the books | $1,558 | $1,512 | $3,070 |

August ran 77%. November is at 12%. With lead times of 31–45 days, **November's bookings should
be landing this week and next.** After roughly 20 October, most of the month is unreachable.

For scale: November at even 50% occupancy at current ADR is roughly **$9,000–$10,000** of rent
across the two homes. Right now $3,070 is on the books.

This is a pricing and promotion decision, not a data problem. Shoulder-season rates, minimum-stay
relaxation, and a midweek/extended-stay angle are the usual levers — all PriceLabs settings.

### 🟠 3. The Ludlow ski season is badly under-booked, and ski books early
| Month | Nights booked | Occupancy | ADR |
|---|---|---|---|
| Dec 2026 | 6 / 31 | 19% | $463 |
| Feb 2027 | 1 / 28 | 4% | $402 |
| Mar 2027 | 5 / 31 | 16% | $402 |

**12 ski nights on the books** for a property three minutes from Okemo. Ski inventory is typically
booked months ahead — mid-September is late to be this light for February. The holiday week
(26 Dec – 1 Jan, $2,778) is the one strong position.

Two compounding factors: unit 2 is under renovation, so there is no second unit to sell; and the
listing has only existed since February 2026, so it has thin review history going into its first
full season.

### 🟠 4. You are ~90% dependent on Airbnb
| Property | Airbnb | VRBO | Direct | Booking.com |
|---|---|---|---|---|
| Flagstone | 46 stays / $52,228 | 6 / $6,454 | **2 / $1,521** | — |
| Amory | 46 stays / $72,502 | 2 / $5,061 | **0** | 1 / $722 |
| Ludlow | 4 / $8,083 | — | — | — |

**Direct bookings are 2 stays out of 103 — about 1% of revenue.**

This is the structural case for the eseospace site. Every booking that moves from Airbnb to direct
changes the platform fee from 15.5% to 4% under your own Exhibit A schedule. On the trailing
$123k, shifting even 15% of volume direct is roughly **$2,100/yr of platform cost removed from the
guest price** — which is either margin or a sharper nightly rate, your choice. It also reduces the
single-channel risk of being 90% dependent on one platform's algorithm.

### 🟡 5. Cancellations look partly like a system artifact, not guest behaviour
23 cancellations across 2026 (Amory 12, Flagstone 9, Ludlow 2). Two clusters do not look organic:

- **Amory, 29–31 May:** three separate reservations for the identical dates, all booked 4 May, all
  cancelled within 12 days.
- **Ludlow, 13–16 Feb:** two reservations for identical dates, cancelled at the **exact same
  timestamp** (2026-03-01 15:50:17).

Identical dates cancelled simultaneously suggests double-booking or a payment-retry loop, not
guests changing plans. Worth a look in Hospitable.

Only one cancellation carried real revenue: **HA-C0Y31S**, a VRBO 7-nighter for 10–17 Oct worth
**$1,653**, booked 286 days ahead in Dec 2025 and cancelled in July. Those dates are only partly
refilled — **11–16 Oct is still open at Flagstone.**

---

## Also worth noting

**There are zero blocked nights on the entire calendar** — no owner stays, no maintenance holds,
nothing, across all three properties for the whole forward period. Occupancy above is therefore
true calendar utilisation. But it also means the calendar carries no operational reality: item 1
is the immediate consequence.

**February is the weakest completed month at 39%**, and it is ski season. Flagstone and Amory are
not ski properties, so that is expected for them — but it makes Ludlow's February performance the
one that should carry the quarter, and Feb 2027 currently sits at 4%.

## What I would do next, in order
1. **Block the Amory renovation nights** — today, 7 days of exposure
2. **November pricing review** — the window closes in ~3 weeks
3. **Ludlow ski pricing + listing push**, and pin down unit 2's completion date
4. **Settle the gross/net revenue question** — one reservation comparison unlocks owner statements
5. **Check the duplicate cancellations** in Hospitable for a sync fault
