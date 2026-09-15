---
name: "nehc-owner-report"
description: "Generate a monthly New England Host Co. owner statement PDF for a property. Use when the user says \"owner report\", \"owner statement\", \"monthly statement for [property]\", or names a property + month. Pulls live revenue from Hospitable via PriceLabs, applies that property's executed agreement terms from the contract registry, and saves a branded PDF."
---

# NEHC Owner Report Generator (Tool #1 — "the CFO")

Generates a monthly, send-ready owner statement PDF. Revenue is pulled **live** from Hospitable
(PMS name `smartbnb`) via the connected **PriceLabs** MCP. **Never invent numbers** — every
figure traces to a data source or a documented contract term. Missing data gets a visible flag,
never a guess.

---

## 🛑 STOP — THIS TOOL IS CURRENTLY BLOCKED

**Do not generate an owner statement for any property until its terms are verified.**

Phase 0 discovery (2026-09-15) found that this skill previously **hardcoded fee terms in the
prompt** and applied them to every property: a 20% management fee, a $250 monthly minimum, no
OTA deduction, pet fees paid to the owner, and a 50% owner share of early/late fees.

The Management Agreement template states **25%**, OTA fees **deducted before** Rental Proceeds
are calculated, and pet / early / late fees **retained by NEHC** (Part II §B.1).

Will confirmed 2026-09-15: **"our contract is customizable for some owners."** So an override
can be perfectly legitimate — **but it must come from that property's executed agreement, and
it must be recorded per property.** Applying one owner's negotiated terms to every owner is the
actual defect.

**Current status of all four properties in `registry/contract-terms.yaml`: `UNVERIFIED`.**

### Required behaviour
1. Load the property's terms from `registry/contract-terms.yaml`.
2. If `source: UNVERIFIED` or `DRAFT_NOT_EXECUTED` → **stop.** Produce no PDF. Reply:
   *"`HUMAN APPROVAL REQUIRED` — I don't have verified terms for {property}. I need the executed
   agreement (including any Exhibit A) before I can calculate a statement. Specifically:
   management fee %, whether OTA fees are deducted, pet/early/late fee treatment, and any
   minimum monthly fee."*
3. If the owner's `legal_name` is `UNKNOWN` in `registry/owners.yaml` → **stop.** No owner-facing
   document is produced for an unnamed owner.
4. **Never fall back to the default terms silently.** An unverified property is a stop, not a
   default.

---

## Company facts (stable)
- Legal entity: **Kembo Homes LLC DBA New England Host Co.** · newenglandhostco.com · 603-848-0521
- Will Robichaud — Owner/Operator. **Kyle Michaud — business partner** (confirmed by Will, 2026-09-15).

## Terms — read from the registry, never from this file
All fee logic lives in `registry/contract-terms.yaml`: `management_fee_pct`,
`minimum_monthly_fee`, `technology_fee_monthly`, `rental_proceeds.basis`,
`rental_proceeds.channel_bookings_deduct_ota_fees`, `guest_fees_retained_by_nehc`,
`pet_fee_to_owner`, `early_late_fee_owner_share_pct`, `statement_basis`, `payment_due_day`,
`repair_cap_without_owner_auth`, `emergency_repair_notify_threshold`.

**Do not restate a fee percentage anywhere in this file or in a prompt.** That is how the
original conflict happened.

## Property roster — resolve via `registry/properties.yaml`

**Eligible for statements (ACTIVE_MANAGEMENT, once terms are verified):**
| Property ID | PriceLabs listing_id |
|---|---|
| NEHC-P-FLAGSTONE | `1145414` |
| NEHC-P-AMORY | `912900` |
| NEHC-P-LUDLOW | `8e787b69-4ece-4241-a47c-f2b8ae540290` |

**NEHC-P-LAKESHORE** (230 Lake Shore Dr / Strolling Woods) — **ONBOARDING**, draft agreement,
no listing, no bookings. Not eligible.

### 🔴 HISTORICAL — never generate a statement for these
Confirmed by Will 2026-09-15 ("other properties are old ones"); zero reservations in all of 2026:
`947332` 114 Dover Road · `947334` 59 Tracy Lane · `1309266` Charming home with hot tub ·
`1025588` + `85444` The Blue Lodge · `950086` Cape Oasis · `950864` Akapesket ·
`979114` Mashpee House · `988406` Charming Cape House · `988408` Beautiful Home w/ Pool ·
`988410` Cape Cod Escape.

**These previously appeared in this skill as the "Known property roster."** They are not NEHC
properties. Producing a statement for one would send a financial document to someone who is not
a client.

### ⛔ Batch mode is disabled
The previous *"run all owner reports for <month>"* mode iterated `get_listings` — which returns
all 14 listings in the PriceLabs account, including the 11 historical ones. **Do not iterate
`get_listings`.** Only ever run against an explicit property ID from the eligible table above,
one at a time, each with verified terms.

## Workflow (once unblocked)

### 1. Resolve the property
From `registry/properties.yaml` by `id`. Take `pricelabs_listing_id` + `pms_name` from the
registry — **do not search PriceLabs by name.**

### 2. Pull reservations (checkout-month basis)
`get_bookings_report` with `filters: {"listings": [{"listing_id": "<id>", "pms_name":
"smartbnb"}], "booking_status": ["booked"]}` and a `date_filters` window wide enough to catch
long stays checking in the prior month and out the next (e.g. for July: min check-in 06-01, max
08-15). `limit: 200+`.

Then keep **only reservations whose CHECKOUT date falls in the target month.** Each kept row
gives `reservation_id`, `booking_source`, check-in, check-out, `no_of_days`, `rental_revenue`.

⚠️ **Revenue field selection matters and is terms-dependent.** PriceLabs exposes
`rental_revenue`, `ota_commission`, and `rental_revenue_minus_ota_commission` as *distinct*
fields. Which one is contractual "Rental Proceeds" depends on that property's
`channel_bookings_deduct_ota_fees` setting. **Read the flag; do not assume.** `total_cost`
includes cleaning, fees and taxes and is **never** Rental Proceeds.

Also pull `booking_status: ["cancelled"]` if refunds need reflecting; flag refunds over the
registry threshold.

### 3. Compute — this is arithmetic, not reasoning
Apply the registry terms mechanically:
- **Rental Proceeds** = sum of the correct revenue field across kept reservations
- **Management Fee** = `rental_proceeds × management_fee_pct`, floored at `minimum_monthly_fee`
  **only if that property's terms define one** (the template does not)
- **Technology Fee** = `technology_fee_monthly`
- **Maintenance & Repairs** = repairs **completed in the target month** for this property.
  ⚠️ Read from the **live Google Sheet** `1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw`
  (Cost Estimate `COL$N` / Date Completed `COL$O`), **not** the `.xlsx` archive — the ticket
  system writes to the Sheet, so the Sheet is current. Dates are **D/M/YYYY**.
- **Pass-throughs** — only where that property's terms grant them to the owner
- **Net Owner Payment** = Proceeds − Mgmt Fee − Tech Fee − Maintenance − other expenses + pass-throughs

**Show the arithmetic in chat before rendering so it can be checked.**

### 4. Render the PDF
Use the ReportLab generator in `scripts/owner_statement.py`, driven by the registry values —
**never with fee constants typed into the script.** Verify with `pdftotext -layout` before
presenting.

### 5. Deliver
Save the PDF and present it. Offer to file a copy in the property's Drive `Owner Reports`
folder. **Default delivery is save for Will's review — never auto-email an owner.**
Sending an owner statement is `HUMAN APPROVAL REQUIRED`, every time.

## Guardrails
- **Unverified terms → stop.** No statement, no default, no estimate.
- **Unknown owner name → stop.**
- No fabricated figures. Missing data → visible flag.
- Repairs over the registry's `repair_cap_without_owner_auth`, and refunds over the refund
  threshold: flag for owner notification.
- Never run against a HISTORICAL listing. Never iterate `get_listings`.
