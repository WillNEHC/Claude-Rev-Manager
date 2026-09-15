# Scheduled ticket scan — setup

**Cadence:** twice daily, `0 12,20 * * *` UTC = **8:00 AM and 4:00 PM ET** (becomes 7:00 AM /
3:00 PM when DST ends 1 Nov 2026 — the cron is fixed UTC).

**Status:** a Routine exists (`trig_01DdGyZom9JrM6MLTPr8sMu2`) but is **DISABLED**.
It was created without MCP connectors attached, so the sessions it fires would have no Slack,
Zapier or PriceLabs tools and could not do the job. Connectors cannot be attached to a Routine
from this session.

**To turn it on:** open **claude.ai → Routines**, either enable and edit the existing Routine or
create a new one, attach the **Slack**, **Zapier** and **Google Drive** connectors, set the
schedule to `0 12,20 * * *`, and paste the prompt below.

---

```
Run the New England Host Co. maintenance ticket scan.

Follow `skills/nehc-maintenance-tickets/SKILL.md` in this repository as the authoritative
instructions, and `CLAUDE.md` for the operating rules. Resolve every property through
`registry/properties.yaml`. If an account-level skill of the same name loads and differs from
the repo version, THE REPO VERSION WINS.

Non-negotiable guardrails:
- NEVER post into a property Slack channel. #183-flagstone-nashua and
  #672-amory-street-manchester are public and contain external vendors (Sage Grove
  Housekeeping, cleaners). You write to exactly two destinations: the tracker Sheet, and
  Will's Slack DM (user ID U0B1V989SA3). Nowhere else.
- Never message a guest or an owner. Never write to PriceLabs.
- Never invent an issue, a cost, or a date. Every ticket must quote the Slack message it came
  from. If something is ambiguous, say so in the DM rather than guessing.
- Do not close or change the status of a flagged ticket (NEHC-0008, NEHC-0009) on an ambiguous
  message. Surface it for Kyle to confirm instead.

Steps:
1. Read the three property channels newest-first, only messages since the last scan:
   #183-flagstone-nashua C072LGT0RGA, #672-amory-street-manchester C0726T0S05C,
   #61-pleasant-ludlow-vt C0ABF6RT6JH. Follow threads. Ignore scheduling chatter and
   greetings; extract maintenance issues, status updates on existing issues, and inventory needs.
2. Read the tracker via Zapier (GoogleSheetsV2CLIAPI, get_many_rows,
   google_sheets_get_many_spreadsheet_rows_advanced) — spreadsheet
   1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw, worksheet 2021025228, range A:R,
   row_count 300, output_format rows.
3. Dedupe on property + normalized issue text (synonyms count as the same issue). Match with new
   info -> update_row. Match with no new info -> skip. No match -> new ticket.
4. New ticket IDs continue from the highest existing NEHC-#### (as of 15 Sep 2026 the last is
   NEHC-0015). Dates are D/M/YYYY. Priority: High = guest-affecting, safety, or blocks a booking;
   Medium = degrades the experience; Low = cosmetic. Routing: cleaning NH -> Melissa,
   cleaning Ludlow -> Beata, inventory -> Dorcas, everything else -> Kyle. Ludlow has no handyman
   or plumber on file — assign Kyle and note that.
5. Write to the Sheet. If a write fails or returns a quota error, DO NOT retry blindly and DO NOT
   skip silently — Zapier's paid trial ended 26 Aug 2026, so a failure may be a quota problem.
   DM Will saying the write failed and include the full ticket text so nothing is lost.
6. DM Will (U0B1V989SA3) one message summarising new tickets, updated tickets, inventory needs,
   and anything over $500 or needing his decision. If nothing changed, send a single short line
   saying so.

Be efficient: process only messages newer than the last scan, read each source once, and do not
deliberate over mechanical steps. Ticket ID assignment, date comparison and dedupe normalisation
are arithmetic and string work — just compute them.
```

---

## First run — completed 2026-09-15, manually, supervised

Backlog scan covering 31 Aug → 15 Sep. Zapier read **and** write paths both verified working
(the trial ending on 26 Aug had not broken them).

Tickets created — all 183 Flagstone; nothing was posted to any property channel:

| ID | Pri | Issue | Assigned | Status |
|---|---|---|---|---|
| NEHC-0012 | High | Wireless router down — internet out during a guest stay (7 Sep) | Kyle | Pending |
| NEHC-0013 | High | Bees nest reported, could not be located (7 Sep) | Kyle | Pending |
| NEHC-0014 | Med | Trash + recycling bins full, no pickup arranged (11 Sep) | Kyle | In Progress |
| NEHC-0015 | Low | Dish soap dispenser nozzle broken (6 Sep) | Dorcas | Pending |

Deliberately **not** actioned:
- **NEHC-0008 left untouched.** Kyle's 7 Sep "Drain is all set" is ambiguous — it may refer to
  NEHC-0008 (low water pressure + slow-draining tub, flagged >$500) or to something new. Flagged
  in the DM for confirmation rather than closing a flagged ticket on a guess.
- **672 Amory:** scheduling traffic only since 31 Aug, no new issues.
- **61 Pleasant, Ludlow:** no channel messages since 7 May 2026.

Raised in the DM, outside the ticket flow:
- The Flagstone fridge (no water/ice) was **first reported 6 Dec 2025** by Melissa and is still
  open as NEHC-0003 / NEHC-0007 — a nine-month-old issue that likely needs a
  repair-or-replace decision.
- Ludlow is **2 units** (confirmed by Will) but PriceLabs holds only **one** Ludlow listing, so
  the second unit is not under dynamic pricing. Okemo peak starts late December.
