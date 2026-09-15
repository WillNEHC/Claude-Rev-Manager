# 08 — Security & Permission Map

## A. What this environment can read and write today

| System | Read | Write capability present | Production-safe? | Reversible? |
|---|---|---|---|---|
| Google Drive | ✅ verified | create / update / copy / **trash** / **share** | ⚠️ `share` and `trash` are high-blast-radius | Trash yes (30d); **share changes are not self-reverting** |
| Gmail | ✅ verified | **send** / reply / forward / draft / trash / label | 🔴 **No** — send is irreversible and externally visible | **No** |
| Google Calendar | ✅ verified | create / update / **delete** / respond | ⚠️ Invites notify attendees | Partially |
| Slack | ✅ verified | **send** / schedule / canvas / lists / reactions | 🔴 **No** — channels contain **external vendors** | **No** (edit window only) |
| PriceLabs | ✅ verified | **update prices**, date overrides, customizations, **map/unmap listings** | 🔴 **No** — writes push live to Hospitable → OTAs → guest-facing rates | **No** — a bad price can be booked against instantly |
| Zapier → Google Sheets | ✅ verified | add / update / **clear rows** | ⚠️ `clear_row_s` can wipe ticket history | **No** |
| Zapier → Instagram / Facebook | not exercised | **publish posts** | 🔴 **No** — public brand-facing | **No** |
| Supabase | ✅ project list | migrations, SQL, edge functions, **pause/restore/delete branch** | ⚠️ Both projects paused; no live data at risk today | Varies |
| GitHub | ✅ verified | push, PR, **merge**, **delete file** | ⚠️ Repo is **public** | Yes (git history) |
| Notion / Descript / Gamma / Higgsfield | ✅ verified | create / update / publish | ⚠️ Publishing is outward-facing | Varies |

**Discovery compliance:** no write of any kind was performed. No file deleted or modified, no message sent, no price changed, no automation altered, no permission changed, no code deployed.

## B. Concentration and key-person risk

### 🔴 S-1 — The live Maintenance Tracker is readable by exactly one person
Verified permissions on `1pH3jclgVvOtXww…`:
```
will@newenglandhostco.com — owner
(no other permissions)
```
**Nobody else can open it.** Not Kyle (who is assigned 5 of 7 open tickets), not Dorcas (assigned inventory tickets), not Melissa (who reports most issues). The company's operational ticket system is a **single-reader file in one person's personal Drive**, and its contents feed owner financial statements.

### 🔴 S-2 — The revenue system sits on a personal Gmail
PriceLabs account `74254` is registered to **`michaudkyle@gmail.com`**, not a company domain. The same personal account owns `183 Flagstone Info Sheet`, `672 Amory Info Sheet`, `Property Walkthrough` and `Kembo Homes Leads`. **Pricing for every property, and core property data, is controlled by a personal account** — outside Workspace admin, outside company offboarding, outside any recovery process.

### 🔴 S-3 — Company-critical documents in personal My Drive
The Management Agreement, the live tracker, the owner-email sheet and the June revenue report sit loose at the root of Will's My Drive, not in the NEHC Master shared drive. Shared-drive files survive an individual's departure; My Drive files do not.

### 🟠 S-4 — Two identity domains for the same people
Kyle and Dorcas use `@kembohomes.com` in Slack and `@newenglandhostco.com` in Google. Kyle additionally uses `michaudkyle@gmail.com` for PriceLabs. **No single identity resolves a person across systems** — which breaks offboarding, audit trails, and any future identity-based authority model.

### 🟠 S-5 — External parties inside operational channels
`#183-flagstone-nashua` and `#672-amory-street-manchester` are **public** channels containing external vendors (Melissa, Fernanda). The maintenance skill has **Slack write** into exactly these channels. An automated post here is a message to third parties from the company. Kyle also posted a **physical door code ("The code for the closet is 207")** into a channel with external members — that credential is now in a searchable log.

### 🟠 S-6 — Gemini auto-notes on external calls
Meeting notes are auto-generated and auto-distributed for calls that include seven operators from **other companies**. Nobody selected this behaviour.

### 🟡 S-7 — Public GitHub repository
`WillNEHC/Claude-Rev-Manager` is **public**. Currently clean — `.env.example` has no real values, `.gitignore` is in place, and a secret scan surfaced nothing. But it is a public repo carrying the company's architecture and market strategy, with its **default branch set to a working branch**.

### 🟡 S-8 — No secrets management
No vault, no secret store, no documented key custody. The `.env.example` template expects Supabase service-role keys, Anthropic, OpenAI, Firecrawl and PriceLabs keys with no stated home for them.

## C. Proposed authority levels — mapped to what exists today

*Proposal only. Nothing below is implemented; all of it requires Will's sign-off.*

| Level | Definition | Should cover today |
|---|---|---|
| **L1 · Automatic** | No human in loop | Reading any system; the daily digest; ticket *drafting*; caching reservation data; internal reports |
| **L2 · Execute + Notify** | Acts, then tells Will | Creating/updating a ticket **in the Sheet only**; internal Slack posts to `#dashboard`; filing documents in Drive |
| **L3 · Recommend + Approve** | Proposes, waits | **Any Slack post to a vendor-facing channel**; any guest message; price changes; repairs above the (to-be-reconciled) threshold; refunds; publishing social content |
| **L4 · Human Required** | Will only | Owner statements and payouts; contracts; owner communications; pricing strategy; hiring; anything touching money leaving the business |
| **L5 · Emergency** | Act first, notify within minutes | Guest safety; property damage in progress; lock/access failure during a stay |

**Hard gates to build in before any write capability is enabled:**
1. **No guest or owner message is ever sent by an agent without human approval** (L3/L4).
2. **No PriceLabs write** until there is a defined, reversible, audited path — a bad rate is booked against immediately.
3. **All agent writes are logged** to an append-only event record. None exists today (see doc 04, I-3).
4. **Dry-run mode** must exist for every write tool before it runs unattended.
