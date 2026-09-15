# 03 — Existing Automation & AI Agent Register

**Headline finding: NEHC has three well-built AI agents and a scheduler with nothing in it. `list_triggers` returned an empty set. There are zero scheduled jobs, zero cron entries, and zero active Zaps. Every "automation" in this company is a human typing a command.**

## A. Register

### A-1 · `nehc-owner-report` — "the CFO"
| | |
|---|---|
| **Type** | Claude Skill (AI agent), synced to this environment |
| **Location** | `~/.claude/skills/synced/…/nehc-owner-report/SKILL.md` |
| **What it does** | Generates a branded monthly owner-statement PDF: pulls reservations from Hospitable via PriceLabs, applies NEHC fee logic, reads repair costs from the maintenance tracker, renders via a ReportLab Python script embedded in the skill |
| **Trigger** | **Manual only** — "owner report", "owner statement", "run owner reports" |
| **Touches** | **Owner money.** Reservation revenue, management fees, repair deductions, net payout figures |
| **Active?** | Skill is installed and loadable. **No evidence it has ever produced a delivered statement** — the Drive `Owner Reports` folders are empty |
| **Owner** | Undocumented. Built for Will; no author or changelog in the file |
| **Documented?** | Self-documenting; **not referenced in any SOP, the To-Do sheet, or Drive** |
| **AI necessary?** | **Mostly NO.** Fetch → filter by checkout month → arithmetic → PDF render is fully deterministic. AI is only genuinely needed for anomaly narration. **~90% of this should be a scheduled script.** |
| **RISK** | 🔴 **CRITICAL.** Contains hardcoded fee terms that **contradict the Management Agreement** (see doc 07, C-1), and a 13-property "Known property roster" of which **10 properties have had zero bookings in all of 2026**. Its documented "batch mode" (*"run all owner reports for <month>"*) would iterate `get_listings` and generate statements for properties NEHC does not manage. |

### A-2 · `nehc-maintenance-tickets` — "the ops manager"
| | |
|---|---|
| **Type** | Claude Skill (AI agent) |
| **What it does** | Reads property Slack channels → extracts maintenance/inventory issues → dedupes against the tracker Sheet → appends/updates rows with `NEHC-####` IDs → posts confirmation back to Slack |
| **Trigger** | Documented as *"every 30 min, 7am–9pm, or on demand."* **The 30-minute schedule does not exist.** No trigger is registered. |
| **Touches** | Slack (**writes to channels shared with external vendors**), the live tracker Sheet (**write/update/clear**), `$500+` cost flags, `@`-mentions of Will |
| **Active?** | **NO — stalled.** Last ticket `NEHC-0011` logged 2026-08-23; Sheet last modified 2026-08-31. Slack has carried at least 4 unticketed issues since (dish-soap dispenser broken 09-06, wireless router down 09-07, unlocated bees nest 09-07, trash+recycling overflowing 09-11). |
| **Owner** | Undocumented |
| **AI necessary?** | **YES, genuinely** — free-text triage, synonym dedupe ("ice maker frozen" ≈ "ice machine icing"), priority judgment. But the Slack read, the Sheet read/write, the ID increment and the confirmation post are all deterministic and should be code. **Use a cheap model for triage; reserve reasoning for ambiguous cases only.** |
| **RISK** | 🔴 **HIGH.** (a) Channel registry lists **only 2 of 3 active properties** — `#61-pleasant-ludlow-vt` (`C0ABF6RT6JH`) is **not registered**, so Ludlow issues can never become tickets. (b) It has **Slack write** into vendor-facing channels with no dry-run mode. (c) Its write path depends on Zapier, whose **paid trial ended 2026-08-26**. |

### A-3 · `nehc-ops-digest` — "the morning brief"
| | |
|---|---|
| **Type** | Claude Skill (AI agent) |
| **What it does** | Posts a daily ops brief to Slack `#dashboard` (`C0BPTAF7NUE`): arrivals, departures/turnovers, in-house, open tickets, $500+ approvals |
| **Trigger** | Documented as *"the automated version posts here every morning at 7:00 AM."* **No such schedule exists.** |
| **Active?** | **NO.** `#dashboard` contains exactly **one** message — a **sample** posted by Will 2026-08-12, self-labelled *"Sample brief — the automated version posts here every morning at 7:00 AM."* **34 days later, no second brief has ever posted.** |
| **AI necessary?** | **NO.** Every field is a query + date comparison + string template. **This should be a scheduled script with zero LLM calls.** Highest-confidence cost win in the company. |
| **RISK** | 🟠 **MEDIUM — expectation risk.** The sample message tells the team a brief arrives every morning. It does not. Anyone relying on `#dashboard` to see today's arrivals is reading a 5-week-old sample. |

### A-4 · Google Gemini meeting notes — **the retained notetaker**
| | |
|---|---|
| **Type** | Google Workspace native AI, auto-attached to Meet |
| **Trigger** | **Automatic** on recurring "STR Mastermind -Weekly Meet" (Thursdays 09:30 ET) and ad-hoc Meets |
| **Evidence** | 6 "…Notes by Gemini" Docs (2026-07-31 → 2026-09-11); `gemini-notes@google.com` mail; notes auto-attached to calendar events |
| **Touches** | Meeting content incl. **an external peer group** (`livefreelodgingco@gmail.com`, `lisa@northluxhospitalityco.com`, `taylor@venturestays.net`, `biglakepropertiesnh@gmail.com`, `annecarr79@`, `dai.dacal@`, `linda.calabria@`) |
| **Owner** | Google default originally — **confirmed as the deliberate choice by Will, 2026-09-15** ("I use gemini anyway") |
| **RISK** | 🟠 **MEDIUM — confidentiality.** Notes of calls with **competing operators** are auto-generated and auto-distributed ("These notes have been sent to invited guests in your organization"). Nobody has reviewed what is captured. |

### A-4b · Fireflies.ai — **DECOMMISSION (Will, 2026-09-15)**
| | |
|---|---|
| **Type** | Third-party AI notetaker, OAuth-connected to Google Calendar |
| **What it does** | Auto-joins meetings (Zoom **and** Google Meet), records, transcribes, emails a "Daily Brief" of decisions/action items, and sends pre-meeting prep that **researches attendees** |
| **Evidence** | `fred@fireflies.ai` — "Your meeting recap — The Super Property Method" (Zoom, 2026-09-10); "Meeting Prep: Kris x Will STR Discussion" (2026-08-08); "Catch up on yesterday in 2 minutes" (2026-09-11) |
| **Overlap** | **Fully duplicates Gemini**, which already auto-notes the same Google Meets |
| **Decision** | 🔴 **Will, 2026-09-15: "remove fireflies as i use gemini anyway."** Gemini is the single notetaker going forward. |
| **How it is removed** | It is **not** a calendar attendee (a calendar search for "fireflies" returns nothing), so it cannot be removed by editing events. It joins through an **OAuth grant**. Removal requires, in this order: (1) revoke Fireflies at **myaccount.google.com/permissions**, (2) disable auto-join / delete the account in Fireflies' own settings, (3) check Zoom's installed-apps list, since it recorded a Zoom webinar. **None of these are reachable from this environment** — `NOT ACCESSIBLE IN CURRENT ENVIRONMENT`. |
| **Why it matters beyond cost** | It was recording the weekly mastermind with **seven operators from other companies**, and profiling external attendees. Revoking the grant also stops the transcript store from growing. |

### A-5 · GDIP — Guest Demand Intelligence Platform (unbuilt)
| | |
|---|---|
| **Type** | Full planning package + runnable DB schema, **no application code** |
| **Location** | `github.com/WillNEHC/Claude-Rev-Manager`, branch **`claude/gdip-platform-planning-ov0dgg`** (which is the repo's **default branch**; `main` holds a single empty `chore: initialize main` commit) |
| **Contents** | Next.js/TypeScript scaffold, 16 architecture docs, 5 Supabase migrations (30 tables, 3 views, 76 indexes, pgvector, `match_reviews` RAG fn), 27 passing tests, `config/`, `scripts/` |
| **Purpose** | Evidence-first market intelligence for NH lake STRs (Winnipesaukee, Squam, Newfound, Sunapee) — review mining, trend/opportunity engines, RAG search, monthly reports |
| **Active?** | **NO.** Status in README: *"Planning package (v1.0)… Application code is built in phases."* Both Supabase projects are **paused**. |
| **AI necessary?** | Partly. Extraction/RAG need AI; ingestion, dedup, indexing and reporting do not. The design **already separates these** — `.env.example` sets a cheap extraction model and a stronger synthesis model. |
| **RISK** | 🟡 **LOW today / design debt.** `.env.example` **hardcodes specific model IDs** (`GDIP_EXTRACTION_MODEL=claude-haiku-4-5-20251001`, `GDIP_SYNTHESIS_MODEL=claude-opus-4-8`). Config-driven, so easy to change — but this is exactly the model-lock-in pattern to avoid. Also carries an explicit ToS/data-sourcing risk doc (`docs/15`, `docs/16`) that has **not been signed off**. |

### A-6 · Zapier — connected, but no Zaps
| | |
|---|---|
| **What exists** | **MCP-exposed actions only**, not workflow Zaps: Google Sheets (8 actions, `will@`), Instagram for Business (4, `social@`), Facebook Pages (5, `social@`) |
| **Multi-step Zaps found** | **None** |
| **Status** | **Paid trial ended 2026-08-26** (*"Your Zapier trial has ended 😢"*), followed by ~10 win-back emails. Account is presumed on the free tier. |
| **RISK** | 🔴 **HIGH — silent dependency.** The maintenance-ticket agent's **only verified write path** to the tracker runs through this Zapier Google Sheets connection. A free-tier task ceiling or expired connection breaks ticket writes **with no alarm**. The skill file calls this path "VERIFIED" — it was verified *during the trial*. |

### A-7 · Other AI tooling in the estate
| Item | Status | Note |
|---|---|---|
| Claude Skills (marketing) — `listing-architect`, `vip-listing-audit`, `stella-str-cinematic-director` | Installed, manual | **Third-party** (Dr. Rachel Gainsbrugh / Short Term Gems), not NEHC-authored. They encode *another company's* brand rules and default framings. Using them on NEHC listings imports outside assumptions. |
| Descript "Agent Underlord" | Available, manual | 4 projects — 3× Strolling Woods (2026-09-14), 1× Manchester Sauna |
| Gamma generation | Available, manual | 2 docs |
| Higgsfield AI | Connected, manual | No NEHC assets found |
| Apify | Mail only | Account exists (newsletter addressed to Will); **no NEHC scraper found** |
| Base44 | Mail only | Marketing only; no evidence of use |

## B. The shadow-automation hunt — what I checked and found

| Hunted | Result |
|---|---|
| Scheduled triggers / cron in this environment | **`list_triggers` → empty. Zero.** |
| Zapier multi-step Zaps | None exposed; account post-trial |
| Make.com / n8n / Integromat | **No evidence** in Gmail, Drive, Slack, GitHub, or calendar |
| Webhooks | Only an **unset placeholder**: `GDIP_ALERT_WEBHOOK=` in `.env.example` |
| Apps Script / embedded scripts in Sheets & Docs | **None found.** Trackers and CRM are plain grids |
| Repo CI / GitHub Actions | `.github/` dir exists on the GDIP branch; no workflow runs observed |
| Deployed code | **None.** Both Supabase projects `INACTIVE` |
| Browser extensions | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — cannot be inspected remotely |
| OAuth grants per platform | Partially visible (connector identities in doc 01 §C). **A full per-platform OAuth/connected-apps audit requires console access** — `AUTHORIZATION REQUIRED` |
| Secrets in code | **Clean.** `.env.example` is a template with all values blank; `.gitignore` present |

**Ownerless / undocumented, by severity:**
1. 🔴 The three `nehc-*` skills — **no author, no changelog, no SOP reference, no owner**. They can write to Slack, write to a live Sheet, and produce owner-facing financial documents.
2. 🔴 Zapier Sheets write path — undocumented dependency, post-trial, no monitoring.
3. 🟠 Gemini meeting notes — running on competitor calls; nobody owns the decision.
4. 🟡 GDIP default branch — the repo's default branch is a working branch, not `main`. Anyone cloning gets planning artifacts as if they were production.

## C. Efficiency assessment — where AI is being spent unnecessarily

| Workload | Today | Should be | Saving |
|---|---|---|---|
| Daily ops digest | Full LLM session | **Deterministic script**, zero LLM | ~100% of its AI cost |
| Owner statement math & PDF | LLM-driven | **Script**; LLM only to narrate exceptions | ~90% |
| Ticket dedupe / ID assignment | LLM | **String-normalise + max(id)+1 in code** | ~40% of the skill's cost |
| Slack issue triage & priority | LLM | **Keep AI** — but small/cheap model, only on *new* messages since last watermark | genuine use |
| Reservation lookups | LLM re-queries each run | **Cached daily pull** into one store | large, compounding |

**Rule this establishes for the architecture:** an AI call is justified only when the input is unstructured language or the output requires judgment. Fetching, filtering, arithmetic, formatting, ID assignment and dispatch are code.
