# 04 — Company Data Map
Where each category of information actually lives, and how much it can be trusted.

| Category | Primary location | Secondary / competing copies | Source-of-truth assessment |
|---|---|---|---|
| **Reservations & guest stays** | **Hospitable** (`smartbnb`) — not directly reachable | PriceLabs mirror (read-only, reachable); Airbnb/VRBO/Booking.com/Houfy | 🟢 **Clear.** Hospitable is the system of record; PriceLabs is a faithful read replica. **This is the healthiest data in the company.** |
| **Guest identity & messaging** | Hospitable | — | 🔴 **Unreachable.** Per Management Agreement Part II §A.4, NEHC holds sole and exclusive right to guest info. No guest record is accessible from this environment. |
| **Pricing & market data** | **PriceLabs** (acct `michaudkyle@gmail.com`) | — | 🟢 Clear, single source. 🔴 **But owned by a personal Gmail.** |
| **Revenue (actuals)** | PriceLabs `rental_revenue` per reservation | `STR Revenue Report — June 2026` (one month, stale) | 🟡 **Usable but undefined.** PriceLabs exposes `rental_revenue`, `ota_commission`, and `rental_revenue_minus_ota_commission` as *distinct* fields. **Which one equals contractual "Rental Proceeds" is unresolved** — see doc 07, C-1. |
| **Maintenance & tickets** | `NEHC Maintenance Tracker (Live)` Sheet `1pH3jclg…` | ⚠ Identically-named superseded Sheet `1EOIlrQk…`; ⚠ Dorcas's `.xlsx` (modified **later**, 2026-09-14) | 🔴 **Three-way conflict.** Two files share a name; the two skills point at different files. |
| **Housekeeping / turnovers** | **Slack, as free text** | Turno (not connected); Jobber (cleaner's own); Melissa's own schedule | 🔴 **No system of record.** Turnovers are *inferred from checkouts* by the digest skill. Actual clean status exists only in conversation. |
| **Owner identities & contracts** | Drive — but **no executed agreement exists for any active property** | Blank template; one DRAFT for 230 Lakeshore | 🔴 **Gap.** Owner names for 183 Flagstone, 672 Amory and 61 Pleasant were **not found in any accessible system.** `UNKNOWN — REQUIRES HUMAN INPUT` |
| **Owner pipeline / prospects** | `NEHC Owner CRM` (Kyle) | `Kembo Homes Leads` (michaudkyle@gmail); `Vacasa Homes NH` (wrealestatenh@gmail); `NEHC_Tailored_Owner_Emails` | 🟡 **Fragmented across 4 files and 3 accounts.** Only ~4 of ~180 CRM rows carry status. |
| **Vendors & cleaners** | **Slack membership + the skill's routing rules** | — | 🔴 **No vendor record exists.** No contact list, no rates, no insurance, no W-9s. Vendor knowledge lives in a skill file and in people's heads. |
| **Financials / accounting** | **NOT FOUND** | — | 🔴 **Critical gap.** No accounting platform found. No ledger, no payouts register, no P&L, no bank data. |
| **Owner statements (delivered)** | `Owner Reports` folders exist and are **empty** | — | 🔴 No historical record of what any owner has been told or paid. |
| **Damage claims** | Slack `#damage-claims` + **Waivo** (not connected) | — | 🟡 Process works; entirely manual and un-logged outside Slack. |
| **Property facts / info sheets** | `183 Flagstone Info Sheet`, `672 Amory Info Sheet` — **owned by `michaudkyle@gmail.com`**, linked from Slack channel topics | Template `Info Sheet` folders in NEHC Master (empty) | 🟠 **Continuity risk.** Core property data sits in a personal account outside the company drive. **No info sheet found for 61 Pleasant/Ludlow.** |
| **SOPs** | `NEHC_Property_Onboarding_SOP` (2026-08-29) | `Kembo Homes — Operations SOP & VA Checklists` (2026-03-24, unfinished title); Scribe (not connected) | 🟡 Two generations, two brands, no supersession marker. |
| **Company structure / roles** | `NEHC Business Structure` (Kyle) | `Amended & Restated Operating Agreement` (2026-08-18) | 🟠 Structure doc **5 months stale** (2026-04-07); still describes roles as "VA" that are now named people. |
| **Marketing & content** | Drive `Content Vault` ×2 trees; Gamma; Descript | — | 🟡 High volume, duplicated across two roots, no naming convention. |
| **Projects / priorities** | `Will/Kyle To Do` sheet | Slack; calendar | 🔴 12 items, **almost all without owner, next step or date.** |
| **Meetings** | Google Meet + **Gemini auto-notes** in Drive | Otter.ai — **connected but empty** | 🟡 Working, but unmanaged and partly with external parties. |
| **Market/competitive intel** | GDIP schema (**unbuilt, DB paused**) | `STR Rev Projections`, `CMA's`, `Copy of Deal Analysis Toolkit` | 🔴 Designed, not operating. |

## Cross-cutting data integrity issues

**I-1 — Ambiguous date format in the maintenance tracker.** Dates are written `5/8/2026`, `10/8/2026`, `23/8/2026`. The `23/8/2026` row proves the format is **D/M/YYYY**, which the skill confirms. But `5/8/2026` and `10/8/2026` are indistinguishable from US M/D/YYYY to any human or tool reading the sheet cold. In a US-based company on `America/New_York`, this will eventually be misread. It already affects "Days Open" and any "completed in month" filter used by owner statements.

**I-2 — No stable property key.** The same property is called: `672 Amory Street` (Drive), `#672-amory-street-manchester` (Slack), `*NEW* Beautiful 3 floor Townhome with Sauna` (PriceLabs `912900`), `Manchester - Sauna` (content folders), `672 Armory` [sic] (Kyle's shopping checklist), `672 Amory Street, Manchester, NH` (tracker). **There is no ID that joins these.** Every cross-system operation today relies on a human recognising the alias.

**I-3 — No event history.** Nothing records *what happened when*. There is no log of messages sent, statements issued, prices changed, or approvals given. Any future authority model ("Execute + Notify") has nothing to write to.
