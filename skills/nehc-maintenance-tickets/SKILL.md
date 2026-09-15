---
name: "nehc-maintenance-tickets"
description: "Turn New England Host Co. property Slack channels into structured maintenance tickets (with Ticket IDs) in the live NEHC Maintenance Tracker Google Sheet, then DM the summary to Will. Use when the user says \"run tickets\", \"check maintenance\", \"scan Slack for issues\", \"update the tracker\", \"new tickets for [property]\", or on the scheduled scan. Dedupes against the Sheet — appends new tickets or updates existing ones, never duplicates. Never posts into property channels."
---

# NEHC Maintenance & Ticket Tool (Tool #2 — "the ops manager")

Reads NEHC's per-property **Slack channels** (`kembohomes.slack.com`), extracts maintenance
issues and inventory needs, keeps the **live NEHC Maintenance Tracker Google Sheet** current
(each ticket gets a **Ticket ID**), and **DMs Will a summary**.

**Never duplicate a ticket. Never invent an issue or a cost** — every ticket traces to a
specific Slack message (quote it in Notes).

## 🔴 CHANGED 2026-09-15 — read this first

**This tool NO LONGER POSTS INTO PROPERTY CHANNELS.** Will's instruction, 2026-09-15:
*"Instead of posting in Slack channel, send a DM to me for tickets and update google spreadsheet."*

Reason: `#183-flagstone-nashua` and `#672-amory-street-manchester` are **public channels
containing external vendors** (Sage Grove Housekeeping, cleaners). An automated post there is
a message from the company to third parties.

| | Old behaviour | New behaviour |
|---|---|---|
| Read property channels | ✅ | ✅ unchanged |
| Write to the tracker Sheet | ✅ | ✅ unchanged |
| Post "ticket created" to the property channel | ✅ | ❌ **REMOVED** |
| Notify Will | chat digest only | ✅ **DM to Will (`U0B1V989SA3`)** |

**Rule: this tool writes to exactly two destinations — the Sheet, and Will's DM. Nowhere else.**
Posting to any channel requires explicit human approval, per request, every time.

## Source of truth — the live Google Sheet
Read AND write via the **Zapier** MCP (`selected_api: GoogleSheetsV2CLIAPI`, connected as
will@newenglandhostco.com):
- **spreadsheet** = `1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw` ("NEHC Maintenance Tracker (Live)")
- **worksheet** = `2021025228`
- **Read rows:** `execute_zapier_read_action` · `get_many_rows` · tool_name
  `google_sheets_get_many_spreadsheet_rows_advanced` · params
  `{spreadsheet, worksheet, range:"A:R", row_count:300, output_format:"rows"}`
- **Append:** `execute_zapier_write_action` · `add_row` · `google_sheets_create_spreadsheet_row`
- **Update:** `execute_zapier_write_action` · `update_row` · `google_sheets_update_spreadsheet_row`
  · include `row` = target row number
- **Column map** (18 cols): `COL$A`=Ticket ID, `B`=Property/Address, `C`=Address,
  `D`=Issue Category, `E`=Issue, `F`=Priority, `G`=Date Reported, `H`=Reported By,
  `I`=Assigned To, `J`=Due Date, `K`=Status, `L`=Last Update, `M`=Vendor Needed?,
  `N`=Cost Estimate, `O`=Date Completed, `P`=Days Open, `Q`=Follow-up Required, `R`=Notes

⚠️ **Zapier dependency.** The paid trial ended 2026-08-26. If a Sheet write fails or returns a
quota error, **do not retry blindly and do not silently skip** — DM Will: *"Tracker write failed
— Zapier may be over its limit. N tickets are pending and not saved."* Include the full ticket
text in the DM so nothing is lost.

⚠️ **Never write to the archives:** `.xlsx` `1jc2_l_7OOWNH-u7E9jJDE1vGtK-cZ57_` (owned by
dorcas@) or Sheet `1EOIlrQkLELjJYn7Kd2gjSLoNaEmHyN8fpC000I-T-4I` (pre-Ticket-ID).

📅 **Date format is D/M/YYYY** (e.g. `23/8/2026` = 23 August). Be explicit and consistent — the
existing rows use this and it is easily misread as US M/D/YYYY.

## Ticket IDs
Format `NEHC-####`. To assign: read all existing Ticket IDs, take the highest numeric suffix,
add 1. Existing tickets run NEHC-0001…NEHC-0011, so the next new ticket is **NEHC-0012**.
Never reuse or renumber. **This is arithmetic — do not reason about it, just compute it.**

## Property channel registry
Resolve every property through `registry/properties.yaml`. Current channels:

| Property ID | Channel | Channel ID | Address |
|---|---|---|---|
| NEHC-P-FLAGSTONE | `#183-flagstone-nashua` | `C072LGT0RGA` | 183 Flagstone Drive, Nashua NH |
| NEHC-P-AMORY | `#672-amory-street-manchester` | `C0726T0S05C` | 672 Amory Street, Manchester, NH |
| **NEHC-P-LUDLOW** | **`#61-pleasant-ludlow-vt`** | **`C0ABF6RT6JH`** | **61 Pleasant St, Ludlow VT** |

**🆕 Ludlow was added 2026-09-15.** It was missing from the original registry, so Ludlow issues
could never become tickets. It is a live property with Dec 26–Jan 1 booked.

Will's Slack user ID (DM target): **`U0B1V989SA3`**.

## Team routing
Cleaning-related → **Melissa** (Sage Grove Housekeeping). Inventory orders → **Dorcas**.
Everything else, incl. vendor/contractor coordination → **Kyle**.
Known vendors: Chris O'Neil (handyman/plumbing), Matt (handyman).
⚠️ **No vendor is identified for Ludlow.** For a Ludlow issue, assign Kyle and set Notes:
*"No local vendor on file for Ludlow — assignment needs confirmation."*

## Workflow

### 1. Read new Slack activity
For each registered channel, `slack_read_channel` newest-first; follow replies with
`slack_read_thread`. **Only consider messages newer than `last_scan_ts` for that channel.**
Store the watermark per channel. Processing only new messages is the main cost control here —
never re-scan history.

**First run after 2026-09-15:** the last tracker write was 2026-08-31. Scan back to
**2026-08-31** to catch the backlog. Known untracked issues to expect (verify each against the
live channel rather than trusting this list):
- 2026-09-06 · Flagstone · dish-soap dispenser nozzle broken (Fernanda)
- 2026-09-07 · Flagstone · **wireless router down, internet out during a stay** (Kyle) → guest-affecting = High
- 2026-09-07 · Flagstone · **bees nest reported, could not be located** (Fernanda) → guest-affecting = High
- 2026-09-11 · Flagstone · trash **and** recycling bins full, no pickup arranged (Fernanda)

### 2. Extract candidates
- **Maintenance** — anything broken, needing repair, or needing a vendor
- **Status updates** — messages advancing an existing issue ("plumber scheduled", "fixed")
- **Inventory** — supply/linen needs → Category `Inventory`, assign Dorcas
- Ignore chatter (greetings, scheduling small talk, "great guests")

This step is the one that genuinely needs language understanding. Everything else in this
workflow is deterministic — treat it that way.

### 3. Read the Sheet and DEDUPE (critical)
`get_many_rows`, then match each candidate on **Property + normalized issue text**
(lowercase, strip punctuation; synonyms count as the same issue — "ice maker frozen" ≈
"ice machine icing").
- **Match + new info** → `update_row`: refresh `COL$L` Last Update (date-prefixed), change
  `COL$K` Status, set `COL$O`/`COL$N` if explicitly stated. Do **not** add a row. Do **not**
  change its Ticket ID.
- **Match + no new info** → skip silently.
- **No match** → assign the next `NEHC-####` and `add_row`.

### 4. Fill columns
- **Priority**: High = guest-affecting, safety, or blocks a booking · Medium = degrades the
  experience · Low = cosmetic
- **Cost Estimate / Date Completed**: only when explicitly stated. **Never estimate a dollar
  amount that was not given.**
- **Flags** (internal early-warning thresholds, not contractual): repair likely over **$500**,
  or a guest refund over **$200** → note in `COL$R` and surface in the DM.
  ⚠️ The Management Agreement uses **$800** (repair cap without owner authorization) and
  **$1,500** (emergency-repair notification). $500/$200 are stricter, so they are safe as an
  internal trigger — but they are not the contractual numbers. Do not describe them as such.

### 5. DM Will
After the Sheet is updated, `slack_send_message` to **`U0B1V989SA3`** (direct message).
One message per scan — not one per ticket:

```
:hammer_and_wrench: *Ticket scan — {Weekday, Mon D, h:mm A}*

*New ({n})*
• {NEHC-####} [{Priority}] {Property} — {Issue} → {Assignee}
*Updated ({n})*
• {NEHC-####} {Property} — {what changed}
*Inventory ({n})*
• {NEHC-####} {Property} — {items} → Dorcas
:rotating_light: *Needs your approval*
• {NEHC-####} — {short reason} (likely >$500)

_Scanned: {channels}. Nothing posted to any property channel._
```

If nothing changed, DM: `:white_check_mark: Ticket scan — no new issues.` — or skip the DM
entirely on a quiet scan if Will prefers less noise (ask him once, then honour it).

### 6. Close out
Update each channel's `last_scan_ts`.

## Guardrails
- **Two write destinations only: the tracker Sheet, and Will's DM.** Never a property channel,
  never a guest, never an owner.
- Always read + dedupe before writing. Never renumber existing tickets.
- Every ticket traces to a real Slack message — quote it in Notes. No invented issues or costs.
- If a data source is unreachable, **say so in the DM**. Never fill a gap with a guess.
- Ambiguous assignee → mark "confirm assignee" rather than choosing.
- Feeds the owner report (repair costs) — keep Cost Estimate and Date Completed accurate.
