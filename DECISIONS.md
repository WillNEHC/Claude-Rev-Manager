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

### Still open
- Owner names + executed agreements for Flagstone, Amory, Ludlow → unblocks owner statements
- Beata Balazsi's role at 61 Pleasant (owner / cleaner / local contact?)
- Ludlow unit count — Kyle said "2 new units"; PriceLabs shows 1; Happy Guest form says "5 active units"
- No housekeeping or handyman vendor identified for Ludlow, which has Dec 26–Jan 1 booked
- Contractor "Winston" — 672 Amory shower remodel, abandoned, flagged >$500, unresolved
- Kyle + Dorcas still cannot read the live maintenance tracker (Will is the only permitted account)
