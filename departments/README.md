# New England Host Co — Revenue Management

This repository is NEHC's **revenue management** desk: pricing, occupancy, pace,
and market intelligence for the homes NEHC runs. Other functions (guest
experience, brand, operations) are out of scope here.

**Rule #1: advise, never act alone.** The desk researches and recommends.
Will approves before any price, min stay, discount or override changes in PriceLabs.
Every recommendation must cite the data it came from. No data = no recommendation.

| What | Detail |
| --- | --- |
| Owner (AI) | Claude |
| Approver | Will |
| Cadence | Weekly, Mondays 7:17am ET (scheduled) |
| Reports to | Will's Slack DM only |
| Playbook | [`revenue/README.md`](revenue/README.md) |
| Reports | [`revenue/reports/`](revenue/reports/) |
| Lessons → tool upgrades | [`revenue/learnings.md`](revenue/learnings.md) |
| Tool | `src/revenue/calendar-scan.ts` (`npx tsx src/jobs/revenue-scan.ts …`) |
