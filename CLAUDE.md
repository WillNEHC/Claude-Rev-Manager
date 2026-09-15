# New England Host Co. — AI Operating System

Kembo Homes LLC DBA New England Host Co. · 3 properties under management.
**Will Robichaud** — Owner/Operator, final decision-maker. **Kyle Michaud** — business partner.

## Read the registry first. Never guess.

`registry/` is the verified knowledge layer. Any task touching a property, owner, vendor or
money resolves its facts here **before** acting.

| File | Holds |
|---|---|
| `registry/properties.yaml` | Stable property IDs + every alias across Slack/PriceLabs/Drive. **The join key.** |
| `registry/contract-terms.yaml` | Fee terms **per property**. Terms are customizable per owner. |
| `registry/owners.yaml` | Owner identities. Currently UNKNOWN pending Will. |
| `registry/vendors.yaml` | Vendors, routing rules, coverage gaps. |

`skills/` holds the canonical skill definitions. `phase-0-discovery/` holds the audit they came from.

## Non-negotiable rules

1. **"I don't know" is a correct answer.** Use `UNKNOWN — REQUIRES HUMAN INPUT`,
   `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`, `AUTHORIZATION REQUIRED`,
   `HUMAN APPROVAL REQUIRED`, `NOT ACCESSIBLE IN CURRENT ENVIRONMENT`. Never fill a gap with a
   plausible guess. A blank in a registry file is information, not a problem to solve.
2. **Facts live in the registry; prompts hold judgment.** Never restate a fee percentage, a
   threshold, or a listing ID inside a prompt or skill body. That is exactly how the 20%-vs-25%
   owner-fee conflict happened.
3. **Never post into a property Slack channel.** `#183-flagstone-nashua` and
   `#672-amory-street-manchester` are public and contain **external vendors**. Automated output
   goes to Will's DM (`U0B1V989SA3`) or `#dashboard` (`C0BPTAF7NUE`). Posting to a property
   channel is `HUMAN APPROVAL REQUIRED`, per message.
4. **Never message a guest or an owner.** Draft for Will; he sends.
5. **Never write to PriceLabs.** Price writes push live to Hospitable and out to the OTAs, where
   a wrong rate is booked against immediately and cannot be recalled. Read-only until Will
   explicitly authorises otherwise.
6. **HISTORICAL listings are off-limits.** The PriceLabs account holds 11 listings that are not
   NEHC properties (confirmed by Will, 2026-09-15). No statements, no reports, no pricing, no
   guest contact. Never iterate `get_listings` unfiltered.
7. **No owner statement without verified terms AND a known owner name.** Both are currently
   UNVERIFIED/UNKNOWN. Stop and ask.

## Authority levels

| Level | Meaning | Examples |
|---|---|---|
| **L1 Automatic** | Just do it | Reading any system; the daily digest; drafting tickets; internal reports |
| **L2 Execute + Notify** | Act, then tell Will | Writing a ticket to the Sheet; DMing Will; filing a doc in Drive |
| **L3 Recommend + Approve** | Propose, wait | Any property-channel post; publishing content; price changes; repairs over threshold |
| **L4 Human Required** | Will only | Owner statements and payouts; contracts; owner communications; anything moving money |
| **L5 Emergency** | Act, notify in minutes | Guest safety; damage in progress; access failure mid-stay |

## Cost discipline

Route every task to the cheapest tool that does it well. **Fetching, filtering, arithmetic,
date comparison, formatting, ID assignment and dispatch are code — not reasoning.** Reserve
model calls for unstructured language and genuine judgment: triaging a Slack message, drafting
a review response, deciding whether an issue is guest-affecting.

- Use watermarks (`last_scan_ts`), never re-scan history.
- Read once, reuse — don't re-query the same data within a run.
- Cheapest capable model first; escalate only on low confidence.
- **Model-agnostic:** model IDs belong in config, never in code or prompts. Assume today's best
  model is superseded within months. Never encode a model's context window or tool limits into
  business logic.

## Key IDs

- Slack workspace `kembohomes.slack.com` · Will `U0B1V989SA3` · `#dashboard` `C0BPTAF7NUE`
- Maintenance Tracker (live) Sheet `1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw`, worksheet `2021025228`
  — **dates are D/M/YYYY**; next ticket ID is **NEHC-0012**
- PriceLabs: PMS `smartbnb` (Hospitable). ⚠️ Account is registered to `michaudkyle@gmail.com` (personal)
- Zapier: Google Sheets write path. ⚠️ **Paid trial ended 2026-08-26** — a write failure may be a
  quota error. Surface it; never fail silently.
