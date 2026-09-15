# 09 — Automation Candidate Backlog
Ranked by **time saved · revenue impact · risk reduction · owner/guest experience** — not technical novelty.
**"Needs AI?"** is answered honestly: most of this is not an AI problem.

| # | Candidate | Pain today | Needs AI? | Cheapest thing that works | Authority | Value |
|---|---|---|---|---|---|---|
| **1** | **Turn on the daily ops digest** | Built, never runs. 1 sample in 34 days | ❌ **No** | Scheduled script: query PriceLabs + Sheet, compare dates, fill template, post. **Zero LLM calls** | L1 | Kyle stops reconstructing the day manually |
| **2** | **Restart maintenance ticket capture + add Ludlow** | Stalled since 08-31; ≥4 untracked issues incl. **internet out during a stay** and a **bees nest** | ⚠️ **Partly** | Deterministic: Slack fetch since watermark, dedupe normalise, `max(id)+1`, Sheet write. **AI only** for triage/priority on genuinely new free text — small model | L2 draft / L3 to post | Stops guest-affecting issues falling through |
| **3** | **Reconcile owner-payment terms, then rebuild the statement generator** | 🔴 Conflict C-1; no statement ever delivered | ❌ **No** (after Will decides) | Deterministic fee engine from an **externalised terms table, per property** — never hardcoded in a prompt. AI only to narrate exceptions | **L4** | Contractual + financial correctness |
| **4** | **Property registry with one stable ID** | Same property has 6 names; nothing joins systems | ❌ **No** | One table: `property_id` → Slack channel, PriceLabs listing, Drive folder, address, aliases, owner, status | L1 | **Prerequisite for every other item** |
| **5** | **Owner registry + executed-contract store** | 🔴 U-1: no owner is known for any active property | ❌ **No** | Structured record + signed PDFs in the shared drive | L4 to populate | Unblocks all owner-facing work |
| **6** | **Cached reservation layer** | Every tool re-queries PriceLabs live | ❌ **No** | One scheduled pull/day into a store; everything reads the cache | L1 | Large compounding cost + latency saving |
| **7** | **Collapse the 3 maintenance trackers into 1** | 🔴 Conflict C-3; two share a name | ❌ **No** | Pick one, archive the others, repoint both skills | L2 | Removes a money-path ambiguity |
| **8** | **Vendor registry** | No rates, insurance, W-9s, or contacts anywhere; **no cleaner for Ludlow** | ❌ **No** | A table + document folder | L2 | Continuity + compliance |
| **9** | **Event log (append-only)** | Nothing records what happened | ❌ **No** | One append-only table every agent writes to | L1 | **Prerequisite for "Execute + Notify"** |
| **10** | **Review monitoring + response drafting** | No review data anywhere, against a 4.8+ target | ✅ **Yes** — for drafting | Fetch deterministically; **AI drafts, human sends** | L3 | Directly protects ranking + revenue |
| **11** | **Guest-message triage** | Every issue routes through Kyle personally | ✅ **Yes** | Classify + route with a small model; **never auto-send** | L3 | Biggest single drain on Kyle's day |
| **12** | **Cleaning/turnover schedule of record** | Slack negotiation; turnovers *inferred from checkouts* | ❌ **No** | Shared calendar or Turno; confirm-clean checkbox | L2 | Removes daily 3-person relays |
| **13** | **CRM hygiene + follow-up reminders** | ~2% of rows have status; leads going cold | ❌ **No** | Required fields + date-based reminders | L2 | Recovers pipeline already paid for |
| **14** | **Revenue reporting (occupancy, ADR, RevPAR, pacing)** | One report, 3 months stale | ❌ **No** | Scheduled aggregation over the cache | L1 | Makes "Revenue Management: TBD" ownable |
| **15** | **Owner portal** | 🔴 U-24: the **contract promises one**; none exists | ❌ **No** | Statements + owner-stay booking + contact updates | L4 | Closes a contractual exposure |
| **16** | **Content pipeline consolidation** | 6+ overlapping caption docs, 2 duplicate trees | ⚠️ Partly | Dedupe + naming convention first; AI only for drafting | L3 to publish | Cheap tidy-up |
| **17** | **Bring GDIP online** | Designed, schema-complete, DB paused | ✅ **Yes** — extraction + RAG only | Ingestion/dedup/indexing stay deterministic; **model IDs stay in config** | L1 internal | Growth/Invest intelligence |
| **18** | **Identity reconciliation** | Kyle = 3 identities; Dorcas = 2 | ❌ **No** | A person registry mapping identities → person → role | L2 | Prerequisite for authority + offboarding |

## Cost discipline this backlog establishes

**11 of 18 candidates need no AI at all.** Three need AI only for a narrow slice (triage, drafting, extraction). The expensive pattern to avoid is the one already present: **a full reasoning session doing arithmetic and string formatting.**

Design rules carried forward:
- **Deterministic by default.** AI is the exception, justified per task.
- **Read once, reuse many.** One cached daily pull beats every tool querying live.
- **Small model first.** Triage and classification go to the cheapest capable model; escalate only on low confidence.
- **Watermarks, not re-scans.** Process only what is new since the last run.
- **Facts live in tables, not prompts.** Fee terms, property IDs, thresholds and routing rules belong in data — this is exactly how conflict C-1 happened.
- **Model-agnostic.** Model IDs in config, never in code or prompts. Assume today's best model is replaced within months. *(GDIP's `.env.example` already pins `claude-haiku-4-5-20251001` and `claude-opus-4-8` — keep it config-driven and revisit on every upgrade.)*
