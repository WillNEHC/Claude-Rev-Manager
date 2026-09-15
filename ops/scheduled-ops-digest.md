# Daily ops digest — setup

**Cadence:** once daily, **7:00 AM ET** → cron `0 11 * * *` UTC (becomes 6:00 AM ET when DST ends
1 Nov 2026; use `0 12 * * *` from then for a 7:00 AM ET run year-round).

**Destination:** Slack `#dashboard` (`C0BPTAF7NUE`) — internal channel. Never a property channel.

**Status:** not yet scheduled. It will hit the same limitation as the ticket scan — a Routine
created from a session cannot carry MCP connectors, so it must be created or enabled from
**claude.ai → Routines** with the **Slack**, **Zapier** and **Google Drive** connectors attached.

## Routine prompt

```
Post the New England Host Co. daily ops brief.

Follow `skills/nehc-ops-digest/SKILL.md` in this repository, and `CLAUDE.md` for the operating
rules. Resolve properties through `registry/properties.yaml`.

Scope: ONLY the three active listings — 1145414 (183 Flagstone, Nashua), 912900 (672 Amory /
Townhome with Sauna, Manchester), 8e787b69-4ece-4241-a47c-f2b8ae540290 (61 Pleasant, Ludlow VT).
PMS name is smartbnb. The PriceLabs account holds 11 other listings that are HISTORICAL and are
not NEHC properties — never include them, and never call get_listings unfiltered.

1. Determine today's date in America/New_York.
2. PriceLabs get_bookings_report, booking_status ["booked"], filtered to those three listing IDs,
   date_filters min_check_in_date = today-16d, max_check_in_date = today+4d, limit 300. Classify
   by date comparison: arrival today = check-in == today; departure/turnover today = check-out ==
   today; in-house = check-in < today < check-out; upcoming = check-in in (today, today+3].
3. Read the tracker via Zapier (GoogleSheetsV2CLIAPI, get_many_rows,
   google_sheets_get_many_spreadsheet_rows_advanced) — spreadsheet
   1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw, worksheet 2021025228, range A:R, row_count 300,
   output_format rows. Open = Status not "Completed". Group by priority, High first. Rows whose
   Notes contain "FLAG" are approval items. Dates in the sheet are D/M/YYYY.
4. Post one message to #dashboard (C0BPTAF7NUE). Keep the Arrivals / Departures / Open tickets
   headers even when empty. Turnovers are INFERRED FROM CHECKOUTS — keep that caveat visible,
   Turno is not integrated.
5. If PriceLabs or the Sheet cannot be read, post the brief with that section marked
   "data unavailable — check connection". Never guess and never reuse yesterday's numbers.

This brief contains no judgment — it is a query, a date comparison and a template. Do not
deliberate. Fetch, classify, fill, post. Read each source exactly once.
```

## First run — completed 2026-09-15, manually, supervised

Posted to #dashboard: https://kembohomes.slack.com/archives/C0BPTAF7NUE/p1789487195108839

This was the **second message ever** in `#dashboard`. The first was the 12 Aug sample that told
the team an automated brief posts every morning; none ever did.

State on 15 Sep: 0 arrivals, 0 departures, 1 in-house (Amory through 9/22), 11 open tickets
(4 High), 2 items over $500 awaiting approval, 1 arrival in the next 3 days (Flagstone, Wed 9/16).

Two risks the brief surfaced by cross-referencing reservations against open tickets — neither is
visible from either source alone:

1. **NEHC-0005 — the 672 Amory front door lock is High priority and unresolved, and there is a
   guest in the house right now through 9/22.** An access failure mid-stay is an L5 emergency.
2. **The Amory guest checks out 9/22 and the stair/carpet work begins 9/22** — same day, no
   buffer, and the clean was already moved from 9/22 to 9/25.

That cross-reference is the reason this brief is worth running daily. It costs one PriceLabs
call, one Sheet call and one Slack post.
