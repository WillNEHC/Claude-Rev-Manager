---
name: "nehc-ops-digest"
description: "Post the New England Host Co. daily ops brief to the Slack #dashboard channel: today's arrivals, departures/turnovers, in-house stays, open maintenance tickets, and $500+ flags. Use when the user says \"ops digest\", \"daily brief\", \"run the digest\", \"morning brief\", or on the scheduled 7am run."
---

# NEHC Daily Ops Digest (Tool #3 — "the morning brief")

Posts a daily operations brief to Slack **#dashboard** (`C0BPTAF7NUE`). Pulls live data —
**never invent** arrivals, departures, or ticket counts. If a source is unavailable, say so in
the brief rather than guessing.

## ⚡ Efficiency note — read before running

**This brief contains no judgment.** It is: query two sources → compare dates → fill a template.
Every field is mechanical. Do not deliberate, do not summarise, do not editorialise — fetch,
classify by date comparison, fill the template, post. Target: one PriceLabs call, one Sheet
call, one Slack call, and no reasoning in between.

If this is ever ported to a standalone script, it should run with **zero LLM calls**. Until
then, run it as mechanically as possible.

## Scope — active properties only
Resolve properties via `registry/properties.yaml`. Only these three are under management:
`NEHC-P-FLAGSTONE` (`1145414`) · `NEHC-P-AMORY` (`912900`) · `NEHC-P-LUDLOW`
(`8e787b69-4ece-4241-a47c-f2b8ae540290`). PMS name is `smartbnb` (Hospitable).

🔴 **The PriceLabs account contains 11 other listings. They are HISTORICAL** (confirmed by Will,
2026-09-15; zero reservations in all of 2026). **Never include them in the brief.** Filter
explicitly by the three listing IDs above — do not use an unfiltered "all listings" query.

`NEHC-P-LAKESHORE` (230 Lake Shore Dr / Strolling Woods) is **ONBOARDING** — no listing, no
bookings. Exclude until it goes live.

## Data sources
- **Reservations**: PriceLabs MCP `get_bookings_report`, filtered to the three listing IDs.
- **Open tickets**: the live Sheet via Zapier `get_many_rows` — spreadsheet
  `1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw`, worksheet `2021025228`, range `A:R`,
  `output_format: rows`. Columns: A=Ticket ID, B=Property, E=Issue, F=Priority, I=Assigned To,
  K=Status, R=Notes. **Dates in this sheet are D/M/YYYY.**
- **Cleans/turnovers**: Turno is NOT connected. Infer turnovers from **today's checkouts** and
  **keep that caveat visible in the brief** so the team is not misled.

## Workflow
1. Today's date in `America/New_York`.
2. `get_bookings_report` with `date_filters` `{min_check_in_date: today−16d,
   max_check_in_date: today+4d}`, `limit: 300`, `booking_status: ["booked"]`, **filtered to the
   three active listing IDs**. Classify each reservation from `start_date_parsed` /
   `end_date_parsed`:
   - **Arrival today** = check-in == today
   - **Departure / turnover today** = check-out == today
   - **In-house** = check-in < today < check-out
   - **Upcoming** = check-in in (today, today+3]
3. Read the tickets Sheet. **Open** = Status not "Completed". Group by priority, High first.
   Any row whose Notes contain "FLAG", or that clearly needs owner sign-off, is an approval item.
4. Compose (Slack mrkdwn, tight, no fluff):

```
:sunrise: *NEHC Daily Ops Brief — {Weekday, Mon D}*

:inbox_tray: *Arrivals today ({n})*
• {Listing} ({city}) — {guests} guests, {nights} nts ({channel}), out {checkout}
:outbox_tray: *Departures / turnovers today ({n})*
• {Listing} ({city}) — clean needed
:house: *In-house ({n})*: {Listing (through {checkout})}, ...
:hammer_and_wrench: *Open tickets ({n})*
• [{Priority}] {Property} — {Issue} ({TicketID}, {Assignee})
:rotating_light: *Needs your approval (>$500)*: {TicketID} {short}, ...
:calendar: *Next 3 days*: {n} arrivals — {Listing (date)}, ...
```
Keep the Arrivals / Departures / Open tickets headers even when empty (show "none"). Omit other
empty sections.

5. `slack_send_message` to `C0BPTAF7NUE` (#dashboard).

## Guardrails
- **Live data only.** If PriceLabs or the Sheet cannot be read, post the brief with that section
  marked **"data unavailable — check connection"**. Never guess, never carry over yesterday.
- Turnovers are **inferred from checkouts** (Turno not integrated) — keep that wording.
- One glanceable message. No commentary.
- **Read-only apart from the single Slack post.** This tool changes no record anywhere.
- `#dashboard` is an internal channel. Do not post the brief to any property channel — those
  contain external vendors.
