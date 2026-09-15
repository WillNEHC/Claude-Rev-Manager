# 10 — Recommended Future-State Architecture & Roadmap
**Outline only. Nothing here is built. Phase 0 stops at the recommendation.**

## A. What the findings imply for the six-brain design

The intended end state — Executive, Operations, Guest, Revenue, Growth, Investment brains over one verified knowledge layer, a central event classifier, and a four-level authority model — is **sound**. Discovery does not change the destination. It changes the **order**.

**The finding that reshapes the plan:** NEHC does not have an automation problem. It has a **knowledge-layer problem**. Three capable agents already exist and are well written. They are stalled because:
- there is **no schedule** to run them,
- there is **no stable property/owner/vendor registry** to run them *against*,
- their facts are **hardcoded in prompts** instead of read from data — which is precisely how the 20%-vs-25% fee conflict arose.

**Building six brains on top of today's data would industrialise the conflicts.** The shared knowledge layer is not step 3 of the architecture; it is step 1.

### Layered shape

```
┌─────────────────────────────────────────────────────────────┐
│ AUTHORITY GATE   L1 Auto · L2 Execute+Notify · L3 Approve    │
│                  L4 Human · L5 Emergency                     │
│                  every write passes through · every write    │
│                  lands in the append-only EVENT LOG          │
└─────────────────────────────────────────────────────────────┘
        ▲
┌───────┴─────────────────────────────────────────────────────┐
│ BRAINS  Executive · Operations · Guest · Revenue · Growth ·  │
│         Investment                                           │
│  each brain = a ROUTER, not a model. It picks the cheapest   │
│  capable path: cached lookup → rule → script → small model   │
│  → full reasoning. Full reasoning is the last resort.        │
└─────────────────────────────────────────────────────────────┘
        ▲
┌───────┴─────────────────────────────────────────────────────┐
│ EVENT CLASSIFIER   deterministic first (source, channel,     │
│  keyword, type). AI only for genuinely ambiguous free text.  │
└─────────────────────────────────────────────────────────────┘
        ▲
┌───────┴─────────────────────────────────────────────────────┐
│ ★ VERIFIED KNOWLEDGE LAYER ★  — BUILD THIS FIRST             │
│  Properties (stable ID + every alias) · Owners + executed    │
│  terms · Vendors · Tickets · Reservations (cached) ·         │
│  Contract terms as DATA · People/identity registry ·         │
│  Event log. Every record carries: source, retrieved-at,      │
│  confidence, and an explicit UNKNOWN state.                  │
└─────────────────────────────────────────────────────────────┘
        ▲
┌───────┴─────────────────────────────────────────────────────┐
│ CONNECTORS  Hospitable (PMS, needs direct access) ·          │
│  PriceLabs · Slack · Drive · Gmail · Calendar · Turno ·      │
│  Waivo · accounting (TBD) · website/direct booking           │
└─────────────────────────────────────────────────────────────┘
```

### Three principles the findings force

1. **"I don't know" is a first-class value.** Every record can be `UNKNOWN`, and `UNKNOWN` must propagate to the output rather than being filled in. The owner-report skill already does this well (*"show the line and flag it rather than guessing"*) — make it structural, not per-tool.
2. **Facts live in data; prompts hold judgment.** A management fee is a database field. A prompt is where the fee percentage goes to become wrong.
3. **The cheapest capable tool wins.** A brain is a router. Most "AI tasks" here resolve to a cached lookup or a rule.

## B. Roadmap

### P0 — Stop the bleeding (first)
*Highest risk reduction per unit of effort. Mostly decisions and deterministic work.*

| | Item | Why now |
|---|---|---|
| P0.1 | **Will resolves the fee conflict (C-1)** and the executed terms are recorded per property | Owner money. No statement should be generated until this is settled |
| P0.2 | **Restart maintenance ticket capture; register the Ludlow channel** | ≥4 untracked issues, two guest-affecting |
| P0.3 | **Turn on the daily digest as a deterministic script** | Built, free, zero AI cost, and the team already believes it runs |
| P0.4 | **Collapse the 3 trackers to 1; grant Kyle + Dorcas access** | A single-reader file is the operational system of record |
| P0.5 | **Build the property registry** (stable ID + aliases) | Prerequisite for everything else |
| P0.6 | **Capture owner identities + executed contracts** | Largest single data gap |
| P0.7 | **Move company-critical docs into the shared drive; move PriceLabs to a company identity** | Key-person and continuity risk |
| P0.8 | **Freeze `nehc-owner-report` batch mode** until the 10 dormant listings are classified | Prevents statements for properties NEHC does not manage |

### P1 — Build the knowledge layer & safe execution
Owner + vendor + people registries · cached reservation layer · **append-only event log** · contract terms as data · the authority gate with **dry-run on every write tool** · ticket lifecycle end-to-end · revenue reporting (occupancy, ADR, RevPAR, pacing) · cleaning/turnover schedule of record.

### P2 — Guest & Revenue brains
Guest-message triage (**AI classify, human send**) · review monitoring + drafted responses · owner statement automation on reconciled terms · **owner portal** (closes contractual exposure U-24) · pricing review loop with PriceLabs still read-mostly · CRM hygiene and follow-up automation.

### P3 — Growth & Investment brains
Bring **GDIP** online (Supabase resumed, ingestion → extraction → engines → reports) · deal pipeline and underwriting standard · direct-booking growth once the eseospace site lands · attribution from content → lead → signed owner · portfolio-level executive reporting.

### Sequencing logic
P0 is almost entirely **decisions and deterministic plumbing** — it needs Will's judgment far more than it needs AI. P1 makes agent action *safe and auditable*. Only in P2 does meaningful AI spend begin, and only where language and judgment are genuinely required. This ordering also means the **cheapest work delivers the earliest relief**: items P0.2–P0.4 give Kyle back daily hours using scripts, not models.

## C. Staying model-agnostic

Flagged because model capability is moving fast and today's assumptions age badly:
- **Model IDs belong in config, never in code or prompts.** GDIP's `.env.example` already does this — keep it, and re-evaluate on every model release.
- **Separate the *role* from the *model*:** "extraction model", "triage model", "synthesis model" as named roles, each independently swappable.
- **Never encode a model's limits** (context window, tool-call ceiling, latency) into business logic.
- **Keep the deterministic path primary.** If a better model appears, it should make things cheaper or better — never be required for the system to function.
- **Route by confidence, not by habit.** Cheap model first; escalate only on low confidence. Measure the escalation rate and tune it.

## D. How we test it

| Layer | Test |
|---|---|
| Knowledge layer | Every one of the 3 active properties resolves across Slack, PriceLabs, Drive and the tracker via one ID. Every field is either sourced or explicitly `UNKNOWN`. |
| Digest | Run in shadow for 7 days; diff against what Kyle would have written. Zero fabricated arrivals. |
| Ticket agent | Replay the ≥4 untracked September Slack issues. Expect 4 correct tickets, correct priorities, **zero duplicates** against NEHC-0001…0011. |
| Owner statement | Recompute a past month by hand and by tool. **They must match to the cent** before any statement is sent. |
| Authority gate | Attempt a guest message, a price change and a vendor-channel post as an agent. All three must **block** and request approval. |
| Cost | Track tokens per workload weekly. The digest must trend to **zero** LLM cost. |
| Honesty | Inject a missing data source. The system must say `UNKNOWN — REQUIRES HUMAN INPUT` and must not guess. |
