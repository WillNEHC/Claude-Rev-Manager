# 06 — Operational Maps
Housekeeping · Maintenance · Guest Experience · Revenue · Sales/Growth · Investment · Projects · Workflow

## A. Workflow Map — how work actually moves today

```
GUEST / CLEANER / VENDOR
        │  (Slack message, free text)
        ▼
  #property-channel ──────────────────────────────┐
        │                                          │
        ▼                                          ▼
   KYLE reads it                        [nehc-maintenance-tickets]
        │                                 ⚠ NOT SCHEDULED — stalled 2026-08-31
        ▼                                 ⚠ Ludlow channel not registered
   Kyle decides, dispatches,                       │
   negotiates, schedules                           ▼
        │                                  Maintenance Tracker Sheet
        ▼                                  (via Zapier ⚠ post-trial)
   Vendor does work                                │
        │                                          ▼
        ▼                              [nehc-ops-digest] → #dashboard
   Kyle confirms in Slack               ⚠ NOT SCHEDULED — 1 sample, 2026-08-12
        │
        ▼                              [nehc-owner-report] → PDF
   (nothing is logged)                  ⚠ manual · ⚠ fee terms disputed
                                        ⚠ never delivered
```

**The pattern:** every path converges on Kyle. The three agents were built to intercept these flows — none of them is running. **The company is operating entirely manually while believing it is partly automated.**

## B. Housekeeping Map

| | |
|---|---|
| **Partner** | Sage Grove Housekeeping (Melissa Ferranti) — staffing, QC, linen |
| **On the ground** | Fernanda Cruz (uses her own **Jobber**), Hannah |
| **Coverage** | 183 Flagstone ✅ · 672 Amory ✅ · **61 Pleasant Ludlow ❌ no cleaner identified** |
| **Scheduling** | 🔴 **Slack negotiation.** No shared calendar, no Turno, no system |
| **Turnover truth** | 🔴 **Inferred from checkout dates.** Nobody records that a clean happened |
| **Supplies** | Melissa/Fernanda report shortages in Slack → Dorcas orders. Escalation is ad-hoc (Kyle DoorDashed paper towels within an hour, 2026-08-23) |
| **Deep cleans** | Contract requires **min 2/year at market rate**. 🔴 No schedule, no record of any |

**Observed friction:** late-checkout requests are negotiated live in Slack (1pm→noon, 2026-09-01); a request was posted to the **wrong property channel** twice in one thread; a scheduled clean was moved for a vacation (2026-09-06) with no system to reflect it. Every one of these is a same-day, human-blocking exchange.

## C. Maintenance Map

**Open tickets as of the last tracker write (2026-08-31) — 7 open, 4 completed:**

| ID | Property | Issue | Pri | Assigned | Status |
|---|---|---|---|---|---|
| NEHC-0003 | 183 Flagstone | Ice maker freezing solid; door dispenser frozen | Med | Kyle | Pending — recurring |
| NEHC-0004 | 183 Flagstone | Shower lever installed wrong: hot/cold + on/off reversed, temp fluctuates | Med | Chris O'Neil | Pending |
| NEHC-0005 | 672 Amory | Front door lock dead after battery change | **High** | Kyle | Pending |
| NEHC-0007 | 183 Flagstone | Refrigerator servicing (linked to 0003) | Med | Kyle | Pending |
| NEHC-0008 | 183 Flagstone | Low water pressure + slow-draining tub — *"consistent since onboarding (both units)"* | Med | Kyle | Pending · **🚩 FLAG >$500** |
| NEHC-0009 | 672 Amory | Shower remodel abandoned by contractor "Winston"; paint/materials left on site | **High** | Kyle | In Progress · **🚩 FLAG >$500** |
| NEHC-0010 | 672 Amory | Inventory: queen/twin duvet covers, coffee pods, creamers, sugar, snacks | Med | Dorcas | Pending |

**Untracked issues raised in Slack since the tracker stopped — no ticket exists for any:**
- 2026-09-06 · 183 Flagstone · dish-soap dispenser nozzle broken
- 2026-09-07 · 183 Flagstone · **wireless router down / internet out during a stay**
- 2026-09-07 · 183 Flagstone · **bees nest reported, could not be located**
- 2026-09-11 · 183 Flagstone · trash **and** recycling bins overflowing, no pickup arranged

Two of these (internet out during a guest stay; an unlocated bees nest) are **guest-affecting = High priority** under the skill's own rules.

**Approval thresholds are inconsistent across three sources:**
| Source | Threshold |
|---|---|
| Management Agreement Part I §A.7 | **$800** — cap on a single repair without owner authorization |
| Management Agreement Part II §B.6 | **$1,500** — Emergency Repair owner-notification threshold |
| Both skills | **$500** — "notify owner / requires approval" |
🔴 `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`. The skills are the *most* conservative, so current behaviour is safe — but the numbers must be reconciled before any automated authority model is built on them.

**Refunds:** skills flag guest refunds **>$200**. The agreement (Part II §B.3) gives NEHC sole discretion on refunds with no stated threshold. Origin of $200 is `UNKNOWN — REQUIRES HUMAN INPUT`.

## D. Guest Experience Map

| Stage | Owner | System | State |
|---|---|---|---|
| Booking | Automated | Hospitable + channels | 🟢 Working |
| Pre-stay messaging | Hospitable | Hospitable | ⚪ `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — cannot assess |
| Check-in | Smart lock (contract-required) | — | 🟠 NEHC-0005: **lock dead at 672 Amory** |
| In-stay issues | Guest → Slack → Kyle | Slack | 🔴 Manual, ad-hoc. Internet outage 09-07 handled by asking a departing cleaner to power-cycle a router |
| Late checkout / early check-in | Dorcas → Melissa → Fernanda | Slack | 🔴 3-person human relay per request |
| Reviews | "Will and VA" per org doc | — | 🔴 **No review data found anywhere.** No monitoring, no response process |
| Damage | Dorcas → Waivo | Slack + Waivo | 🟡 Works; entirely manual |
| Guest data | Hospitable (exclusive to NEHC per contract) | — | ⚪ Unreachable |

🔴 **KPI gap:** the org doc sets a target of *"Ratings (4.8+), response time"*. **Neither metric is measured anywhere.**

## E. Revenue Map

- **Engine:** PriceLabs dynamic pricing, `dynamic_pricing: subscribed`, syncing to Hospitable (`syncStatus: 1` on all active listings).
- **Owner:** formally "VA-TBD" — 🔴 **nobody.** Dorcas has configured PriceLabs on request (Ludlow, 2026-01-28).
- **Verified performance, Aug–Oct 2026** (28 reservations, booked status):
  - **183 Flagstone** — 16 reservations. ADR range ~$215–$462. Channels: Airbnb (majority), VRBO, **2 direct bookings**. Lead times 0–134 days.
  - **672 Amory** — 12 reservations. ADR range ~$289–$711. Airbnb-dominant.
  - **61 Pleasant/Okemo** — 3 reservations in all of 2026; strong ski-season ADR ($463–$636); **Dec 26–Jan 1 holiday week already booked at $2,778 rent**.
- **Channel mix:** Airbnb-heavy. Direct bookings exist and work (`HOST-` reservation IDs) — the direct-booking website rebuild with eseospace is the lever here.
- 🔴 **No revenue reporting exists.** One `STR Revenue Report — June 2026` file, 3 months stale. No occupancy tracking, no RevPAR, no pacing, no budget-vs-actual, no per-owner P&L.
- 🔴 **"Rental Proceeds" is not operationally defined** — see doc 07 C-1. PriceLabs exposes `rental_revenue`, `ota_commission` and `rental_revenue_minus_ota_commission` as separate fields; which is contractual is unresolved.

## F. Sales / Growth Map

- **Engines:** referrals (Omni Cleaning drives 3 of 4 live leads), Will's network, social content, direct-booking site (in build), the ~176-row bulk owner list.
- **Positioning:** *local team vs. national manager* — proven, the Franklin owners left **Vacasa**. A `Vacasa Homes NH` sheet is shared into Drive — a target list.
- **Content machine:** high-volume and genuinely productive — weekly caption sets, "Captions - In Will's Voice", Lakes Region 2-week campaign (70 posts), carousels per property, Gamma decks, Descript videos. Distribution via Instagram + Facebook Pages (`social@`, through Zapier).
- **Peer network:** weekly "STR Mastermind" with 7 external operators — a real channel, and a confidentiality consideration (Gemini auto-notes, doc 03 A-4).
- 🔴 **No CRM discipline.** ~2% of CRM rows have status. No follow-up dates. The Meredith lead shows *"Meeting 8/10 @ 10am"* in a notes field with a blank Next-Follow-Up column. The VA-staffing thread went quiet after an 08-21 follow-up.
- 🔴 **No attribution.** No way to tell which content, referral, or campaign produced a lead.

## G. Investment Map

- **Intent is explicit and recent:** `Copy of Deal Analysis Toolkit` (created **2026-09-15 — today**), `STR Rev Projections` + `CMA's` folders, `4BR_STR_Furnishing_Estimate`, `Webster-Lake-Estate-Listing.md`.
- **Active deal-flow behaviour on the calendar:** "Meet Javier for the deposit" (09-01), "Meet Jeremy at 589 Laconia Rd" (09-07), "**Showing: 3029 US-3 Thornton NH**" (09-18).
- **Education:** Bill Faeth/Tyler Coon "Super Property Method" webinar, STR Secrets, "STR on Autopilot".
- **GDIP** is the intended investment-intelligence engine — designed, schema-complete, **unbuilt, database paused**.
- 🔴 **No underwriting standard, no deal pipeline, no buy-box, no capital plan, no portfolio model** found in any system. Investment activity is currently indistinguishable from Will's personal real-estate practice.

## H. Project Map — `Will/Kyle To Do`

| Topic | Owner | Next step | Timeline | Discovery status |
|---|---|---|---|---|
| Evaluate/Implement **Happy Guest** | Will/Kyle | — | — | 🟢 **Moved** — onboarding call held 2026-09-04 |
| Evaluate/Implement **Host Buddy** | Will/Kyle | — | — | ⚪ No evidence of progress |
| Prospect Outreach Strategy | Will/Kyle | "email list?/socials" | — | 🟡 Content running; no outreach system |
| Evaluate **Hospitable** functionality | — | — | — | ⚪ Unassigned, no progress found |
| **Automate/Streamline Owner Reports** | — | — | — | 🟡 Skill built; **never delivered a statement** |
| Marketing Content | Will | — | — | 🟢 Active and high-volume |
| **Website Revamp / Direct Booking** | Kyle | "In process with vendor" | — | 🟢 eseospace mtg 2026-09-17 |
| Maintenance SOP | Kyle | "Excel for now" | — | 🔴 Three conflicting trackers |
| LLC Operating Doc Update | Kyle | "Attorney review" | — | 🟡 Draft dated 2026-08-18 |
| **Add Will to banking** | Kyle | — | — | 🔴 **Unresolved — key-person financial risk** |
| STR Secrets Conference? | — | — | — | ⚪ Undecided |
| **AI Automation ops** | — | — | — | 🟡 **This engagement** |

**7 of 12 items have no owner. 12 of 12 have no date.** This sheet is the company's only project artifact.
