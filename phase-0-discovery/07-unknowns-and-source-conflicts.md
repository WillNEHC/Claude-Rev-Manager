# 07 — Unknowns Register & Source Conflict Register

## PART 1 — SOURCE CONFLICT REGISTER
*Every item here = `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`. I am not resolving any of them.*

### 🔴 C-1 — Owner-payment terms: the skill contradicts the Management Agreement
**The single most consequential finding in Phase 0. This affects money paid to owners.**

| Term | Management Agreement (`1R1bFFDmw4CSRswBMPs5oiA9W1QOmcTT2P6Ry9-qxylw`) | `nehc-owner-report` skill | Gap |
|---|---|---|---|
| **Management fee** | **25%** of Rental Proceeds (Part I §C.1) | **20%** of Rental Proceeds | **5 percentage points** |
| **Minimum monthly fee** | *Not present anywhere in the agreement* | **$250/month minimum**, invoice the shortfall | Skill invents a charge |
| **OTA fees** | Channel bookings: Rental Proceeds = nightly rate **"less fees, charges, or commissions imposed by the Channel"** (§C.2). §C.4 states host-side fees are **"deducted from booking revenue before Rental Proceeds are calculated"** — Airbnb ~3%, VRBO ~5%, Booking.com ~15% | **"OTA booking fee is PAID BY THE GUEST as a pass-through (Exhibit A) — rent is whole. Do NOT deduct Airbnb/VRBO/Booking.com fees from owner rent."** | **Direct contradiction**, worth 3–15% of gross rent |
| **Pet fee** | *"NEHC may charge guests and retain additional… fees, such as a booking fee, **pet fee**… These fees are not 'Rental Proceeds' and are **not shared with the Owner**"* (Part II §B.1) | **"Pet fee $200/stay (100% to owner)"** | **Direct contradiction** |
| **Early/late fees** | Same clause — retained by NEHC | **"owner's 50% share of Early Check-in and Late Check-out fees ($100/hr each)"** | **Direct contradiction** |
| **Technology fee** | $30/month (§A.10) | $30/month | ✅ Agrees |
| **Payment date** | By the 10th, for checkouts in the previous month (§C.2) | By the 10th, checkout-month basis | ✅ Agrees |

**Important qualifier, stated plainly:** the Drive agreement is a **blank, unexecuted template** — `[list all legal owners]`, `[address]`, empty signature blocks. The skill cites an **"Exhibit A"** and *"Confirmed by owner Aug 2026"* — neither of which exists in any accessible file. So either (a) individually executed agreements carry per-owner terms that legitimately override the template, or (b) the skill encodes unverified assumptions. **I cannot tell which, and neither should anyone else without the signed documents.**

**Why this is urgent:** on a month with $10,000 of Airbnb rent, the two readings differ by roughly **$800 of management fee plus up to $300 of OTA deduction** — per property, per month, in opposite directions. The skill has never produced a delivered statement, so **no owner has been paid on the disputed logic yet.** That window closes the moment someone runs it.

**Required to resolve:** the **executed** agreement for each of the 3 active properties, including any Exhibit A.

### 🔴 C-2 — 230 Lake Shore Drive / Strolling Woods: is it managed or not?
| Says managed | Says not yet |
|---|---|
| Marketing doc: *"NEHC just took over management of a lakefront estate on Webster Lake"* (2026-08-30) | Owner agreement is **"Proposed Revisions — DRAFT"** (2026-08-28), unexecuted |
| Full property folder incl. Owner Reports + Onboarding (2026-08-29) | **No Slack channel** (all 3 active properties have one) |
| Photo shoot 2026-09-10; 1.8 GB archive 2026-09-14; 3 Descript videos 2026-09-14 | **No PriceLabs listing** — not priced, not distributed |
| Kyle actively building out folders | **Zero reservations.** The same doc says *"the home is not on the active-marketing list yet"* |

**Consequence:** publishing the drafted announcement copy would assert a completed takeover that is not contractually complete. **Hold all three caption options until the agreement is executed.**

### 🔴 C-3 — Three maintenance trackers, two sharing one name
| File | ID | Owner | Modified | Pointed at by |
|---|---|---|---|---|
| NEHC Maintenance Tracker (Live) | `1pH3jclg…` | will@ | 2026-08-31 | `nehc-maintenance-tickets` + `nehc-ops-digest` |
| NEHC Maintenance Tracker (Live) — **same title** | `1EOIlrQk…` | will@ | 2026-08-12 | marked "archive, never write" |
| Maintenance_Tracker_New England Host **.xlsx** | `1jc2_l_7…` | **dorcas@** | **2026-09-14** | **`nehc-owner-report`** for repair costs |

The owner-report tool reads repair costs from Dorcas's .xlsx; the ticket tool writes to Will's Sheet. **They are not the same file.** The .xlsx was modified *more recently* than the Sheet. Repair deductions on owner statements could come from a file the ticket system never updates.

### 🟠 C-4 — Repair approval threshold: $500 vs $800 vs $1,500
Agreement §A.7 = **$800** cap without owner authorization; §B.6 = **$1,500** emergency-notification trigger; both skills = **$500**. Current behaviour is the most conservative, so no harm done — but three numbers cannot all be policy.

### 🟠 C-5 — Portfolio size: 3 vs 5 vs 13 vs 14
| Source | Count |
|---|---|
| Slack property channels | **3** |
| Properties with 2026 bookings | **3** |
| Happy Guest onboarding form (Kyle, 2026-09-04) | **"# Of Active Units: 5"** |
| `nehc-owner-report` "Known property roster" | **13** |
| PriceLabs account total | **14** |
Plus Kyle's 2026-01-28 note about *"2 new units"* at 61 Pleasant. Properties vs. *units* likely explains 3→5; nothing explains 13/14.

### 🟡 C-6 — Duplicate "CLAUDE TOOLS MASTER" trees
Two full folder trees with the same name, one in the shared drive, one in Will's My Drive. Neither marked authoritative.

### 🟡 C-7 — Two SOP generations under two brands
`NEHC_Property_Onboarding_SOP` (2026-08-29) vs `Kembo Homes — Operations SOP & VA Checklists` (2026-03-24). No supersession marker. Org doc is 5 months stale and still names roles as "VA".

### 🟡 C-8 — Ambiguous dates in the tracker
`5/8/2026`, `10/8/2026`, `23/8/2026`. The last proves D/M/YYYY, but in a US company the first two are ambiguous to any reader or tool. Affects "Days Open" and month-based owner-statement filters.

---

## PART 2 — UNKNOWNS REGISTER
*All items = `UNKNOWN — REQUIRES HUMAN INPUT`.*

### Blocking — must be answered before anything is automated
| # | Unknown | Why it blocks |
|---|---|---|
| **U-1** | **Who owns each of the 3 active properties?** No owner name, entity, email or contact exists in any accessible system. | No owner statement, report or communication can be produced or addressed. The skill's own guardrail requires a roster that does not exist. |
| **U-2** | **What are the executed fee terms per property?** (Conflict C-1) | Owner payouts are computed from disputed numbers. |
| **U-3** | **Where does accounting live?** No QuickBooks/Xero/Stripe/bank data found anywhere. | There is no financial source of truth to build a Revenue or Executive brain on. |
| **U-4** | **Status of the 10 dormant PriceLabs listings** — HISTORICAL, FORMER CLIENT, PRE-MANAGEMENT or test? | The owner-report tool's batch mode would generate statements for them. |
| **U-5** | **Is 230 Lake Shore Drive under executed management?** (Conflict C-2) | Determines whether marketing may publish and whether it enters the portfolio. |

### High priority
| # | Unknown |
|---|---|
| U-6 | **Beata Balazsi's role** — owner, cleaner, or local contact for 61 Pleasant? |
| U-7 | **Who cleans 61 Pleasant, Ludlow VT?** No housekeeping vendor identified for a live property. |
| U-8 | **Is 61 Pleasant one unit or two?** Kyle said "2 new units"; PriceLabs shows one. |
| U-9 | **What is the "5 active units"** on the Happy Guest form? |
| U-10 | **Contractor "Winston"** — is the abandoned 672 Amory shower remodel a live dispute, a payment hold, or written off? |
| U-11 | **Vendor commercial terms** — no rates, insurance, W-9s or scope for any vendor. |
| U-12 | **Is Will on the company bank account yet?** ("Add Will to banking", unresolved.) Key-person financial risk. |
| U-13 | **Guest review performance** — no ratings or response-time data found, against a stated 4.8+ target. |

### Medium
| # | Unknown |
|---|---|
| U-14 | Are AirDNA / Rankbreeze accounts held at all? No evidence found. |
| U-15 | Who administers the Slack workspace and Google Workspace? |
| U-16 | Consent/provenance for the ~176-row bulk owner list — safe to email? |
| U-17 | Waivo account terms, coverage limits, claim history. |
| U-18 | Was the VA hire made? (Thread went quiet after 2026-08-21.) |
| U-19 | Do the Supabase projects hold real data, or are they empty scaffolds? Both are paused; SQL timed out. |
| U-20 | Why is the GitHub repo's **default branch** a working branch rather than `main`? |
| U-21 | Insurance status — does each owner carry the contractually required $1M liability with Kembo Homes named as additional insured? No certificates found. |
| U-22 | Permit/licence status per property — `Legal-Permits` folders exist but are empty. |
| U-23 | Is there a Turno account (skill says "not connected" — dormant or nonexistent)? |
| U-24 | Does any owner portal exist? The agreement references one repeatedly (§A.8, §B.1, §A.5). **None was found.** |

**U-24 deserves emphasis:** the Management Agreement obliges NEHC to provide statements "through an owner portal", requires owners to reserve their own stays "on NEHC's owner portal", and to update contact details there. **No owner portal exists in any system audited.** That is a live contractual exposure, not just a product gap.
