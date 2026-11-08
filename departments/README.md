# New England Host Co — AI Departments

How NEHC runs as a team of AI "departments" with humans approving the decisions.

**Rule #1: advise, never act alone.** Every department researches and recommends.
Will (or Kyle) approves before any price, listing, message or spend changes.
Every recommendation must cite the data it came from. No data = no recommendation.

## The team

| Dept | Status | Owner (AI) | Human approver | Reports to |
| --- | --- | --- | --- | --- |
| Revenue & Pricing | **Live** (since 2026-11-08) — weekly, Mondays | Claude | Will | Will's Slack DM |
| Guest Experience & Reviews | Planned (next) | Claude | Will | Slack |
| Brand & Social | Planned | Muse (Meta) — Facebook/Instagram/Meta ads | Will | Slack + Notion |
| Operations (turnovers, maintenance, VA + cleaners) | Planned | Claude | Will / VA | Slack |
| Owner Relations & Growth | Planned | Claude | Kyle / Will | Slack |

## How Claude and Muse share work

Muse (Meta's agent) and Claude cannot call each other directly. Both connect to
**Slack** and **Notion**, so those are the shared office. Claude posts
"handoffs" (e.g. "3 post ideas for this week, with the data behind them") and
Will forwards or asks Muse to pick them up and build/schedule posts in the
Meta apps. Muse covers what only Meta can: Facebook, Instagram, Meta ads, WhatsApp.

## Folder layout

```
departments/
  README.md                 ← this file
  revenue/
    README.md               ← charter, weekly routine, approval rules
    reports/YYYY-MM-DD.md   ← each weekly report (the approval list)
    learnings.md            ← what each run taught us; feeds the next tool upgrade
```
