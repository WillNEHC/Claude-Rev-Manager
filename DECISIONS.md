# Decision Log

## 2026-09-15 — Will's Phase 0 decisions

| # | Decision | Effect |
|---|---|---|
| D-1 | **Maintenance tickets: DM Will, don't post in property Slack channels.** Still update the Google Sheet. | Removes automated writes into public channels containing external vendors. Implemented in `skills/nehc-maintenance-tickets/SKILL.md`. |
| D-2 | **The management contract is customizable for some owners.** | The 20%-vs-25% gap is not automatically an error — but terms must be stored **per property**, sourced from an executed agreement. Implemented as `registry/contract-terms.yaml`. Statements stay blocked while every property reads `UNVERIFIED`. |
| D-3 | **The other PriceLabs properties are old ones.** | The 11 non-NEHC listings are classified `HISTORICAL`. Excluded from every roster, report and batch job. Batch mode disabled in the owner-report skill. |
| D-4 | **Owner names to follow; accounting is handled separately.** | Owner registry holds `UNKNOWN` placeholders. No accounting integration will be built — it is out of scope until Will says otherwise. |
| D-5 | **Strolling Woods listing drafted 2026-09-14/15.** | Recorded on `NEHC-P-LAKESHORE` as reported by Will (drafted outside audited systems). Status remains `ONBOARDING`: agreement still a draft, no PriceLabs listing, no Slack channel, no bookings. Marketing hold stands. |
| D-6 | **Kyle is Will's business partner.** | Org map corrected — Kyle is a principal, not staff. Reinforces that Kyle needs access to the maintenance tracker (he is assigned 5 of 7 open tickets and currently cannot open the file). |
| D-7 | **"Wire it together."** | Green light for P0. Built: the registry layer, three corrected skills, and this operating spec. **Not built:** live recurring schedules — see "Open" below. |

## 2026-09-15 (later) — Will's closeout decisions

| # | Decision | Effect |
|---|---|---|
| D-8 | **Remove Fireflies.ai; Gemini is the notetaker.** | Ends the duplicate AI notetaker and stops a third party recording calls with competing operators. Fireflies is an OAuth grant, not a calendar attendee, so it **cannot be removed from here** — revoke at myaccount.google.com/permissions, disable in Fireflies, and check Zoom's installed apps. Recorded in the automation register as A-4b. |
| D-9 | **The guest pays OTA fees, via a price uplift on each platform.** | Resolves the ambiguity inside the executed Currier contract. Exhibit A governs; the owner receives the intended base rent whole. Recorded as `OTA_FEE_TREATMENT` in `registry/contract-terms.yaml`. ⚠️ Leaves **one** operational question that must be settled before any statement — see below. |
| D-10 | **Ludlow unit 2 is under renovation.** | Its absence from PriceLabs is deliberate, not lost distribution. No revenue is leaking. Watch item only: Okemo peak books months ahead, so a late listing captures little of the season. |
| D-11 | **NEHC-0005 closed** (672 Amory front door lock). | Written to the live tracker: Status Completed, Date Completed 15/9/2026, follow-up cleared. Open tickets drop from 11 to 10; High-priority from 4 to 3. |

### 🔴 The one thing D-9 leaves open
Will's mechanism is clear, but it makes the statement arithmetic hinge on a single unverified fact:
**is PriceLabs `rental_revenue` the gross marked-up rate, or the net NEHC actually receives?**
Paying the gross overpays the owner by the markup (15.5% on Airbnb); deducting from the net
underpays by the same amount. Same magnitude, opposite directions.

**Settling it takes one reservation:** compare the actual Airbnb/Hospitable host payout for a
completed booking against PriceLabs `rental_revenue` for that same reservation ID. Match = net.
~15.5% higher = gross. That answers it permanently. Blocked on Hospitable access.

### Still open
- Owner names + executed agreements for Flagstone, Amory, Ludlow → unblocks owner statements
- Ludlow unit 2 renovation completion date (unit count itself: resolved — 2 units)
- No housekeeping or handyman vendor identified for Ludlow, which has Dec 26–Jan 1 booked
- Contractor "Winston" — 672 Amory shower remodel, abandoned, flagged >$500, unresolved (NEHC-0009)
- Is `rental_revenue` gross or net of OTA fee? (see D-9) — blocks the first owner statement
- Executed agreements for Flagstone, Amory, Ludlow — none found in any reachable system
- The Javier / FCM matter — NEHC liability or Will's separate real-estate business?
- CRM vs Gmail name conflict on the Meredith lead: "Todd Robinson" vs "Todd Johnson MD"
- Entity: signed contract says Massachusetts LLC; Onboarding folder holds an NH LLC verification
- Kyle + Dorcas still cannot read the live maintenance tracker (Will is the only permitted account)
