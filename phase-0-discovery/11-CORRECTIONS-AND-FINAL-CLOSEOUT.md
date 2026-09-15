# 11 — Corrections & Phase 0 Closeout
**Issued 2026-09-15, after a second pass.** The first pass under-investigated Gmail, left several
authoritative documents unread, and never queried three connected services. This document
corrects the record. **Where an earlier Phase 0 document conflicts with this one, this one wins.**

---

## PART 1 — WHAT I GOT WRONG

### ❌→✅ CORRECTION 1: The 230 Lakeshore agreement is EXECUTED, not a draft

**I said** (docs 05, 07 C-2): *"ONBOARDING / PRE-MANAGEMENT… agreement is a DRAFT, unexecuted…
the marketing copy asserts a completed takeover that the contract does not yet support."*

**The truth:** the agreement was **signed by both parties on 2026-08-26** via Google eSignature.
`230LakeshoreDr-CurrierFinal.pdf` (`1YK4cfXqS90Cqk_9PzeDUXP4-CR56LiN9`), audit trail: sent 15:27 UTC,
owner signed 22:38:31, Will signed 22:41:17, COMPLETED 22:41:17.

**Why I missed it:** I searched Drive for *Docs* modified after 2026-01-01 and read the Doc titled
"…Proposed Revisions **DRAFT**". The executed copy is a **PDF**, and it sits in an `Onboarding`
subfolder I had not opened. Had I searched Gmail properly on the first pass, the eSignature
confirmation would have surfaced immediately. **The marketing copy was accurate. My correction to it
was the error.**

Rand Currier signed after a long negotiation — at least four eSignature rounds between 2026-06-27
and 2026-08-26, including one Will himself rejected.

### ❌→✅ CORRECTION 2: The owner-report skill's fee terms were RIGHT — for one property

**I said** (doc 07, C-1) this was the most consequential finding: the skill's 20% fee, $250 minimum,
"do not deduct OTA fees", and pet-fee-to-owner all contradicted the agreement, and I flagged it as a
potential owner-payment error.

**The truth:** almost every one of those terms is **verbatim correct** for 230 Lakeshore:

| Term | Skill said | Currier executed agreement | Verdict |
|---|---|---|---|
| Management fee | 20% | **20%** (§C.1) | ✅ skill correct |
| Minimum monthly fee | $250 | **$250** (§A.12) | ✅ skill correct |
| Technology fee | $30/mo | $30/mo (§A.13) | ✅ |
| Pet fee to owner | $200/stay, 100% | **"Passed through to Owner in full"** (Exhibit A) | ✅ skill correct |
| Refund notice | >$200 | **>$200, notify BEFORE issuing** (§B.3) | ✅ skill correct |
| Repair cap | $500 | **$500** (§A.7) — not the $800 template cap | ✅ skill correct |
| **"Exhibit A"** | cited as source | **Exhibit A is real and is in the signed contract** | ✅ skill correct |
| Early/late fee 50% to owner | $100/hr, 50% split | **"will not apply to guests if accommodated"** | ❌ **skill wrong** |
| Post-termination commission | (not stated) | **0%** — the 10% provision was removed in negotiation | n/a |

**So the real defect is narrower and more precise than I reported:** the skill encoded **one owner's
negotiated terms** and applied them to **every property**. That is still a genuine and serious flaw —
Rand Currier's 20% is not evidence that Flagstone, Amory or Ludlow are also 20% — but I mis-described
it as the skill contradicting the contract. It did not. It over-generalised from a real contract.

My doc 07 also called "Exhibit A" and *"confirmed by owner Aug 2026"* unlocatable. Both were real:
the Exhibit is in the signed PDF, and the owner confirmation is the 2026-08-26 signature.

**One thing I flagged that got worse, not better** — see New Finding 1.

### ❌→✅ CORRECTION 3: The automation register missed a second AI notetaker

**I said** (doc 03) Gemini meeting notes was *"the only automation actually running."*

**The truth: Fireflies.ai is also running,** and I never checked. `fred@fireflies.ai` sends a
**"Daily Brief"** ("Decisions, action items, and follow-ups from yesterday's meetings"), sends
**meeting-prep emails** with researched attendee backgrounds, and **auto-joins meetings to record**
— on Zoom *and* Google Meet. See New Finding 3.

### ⚠️ CORRECTION 4: Owner names were retrievable and I said they were not

I reported owner identity as the largest data gap with names *"not in any accessible system."* For
three of four properties that holds. For the fourth it did not — **Rand Currier's full name, email,
phone and mailing address were sitting in Gmail and in a signed PDF in Drive the whole time.**
I asserted a gap I had not properly searched for.

---

## PART 2 — NEW FINDINGS FROM THE SECOND PASS

### 🔴 NEW FINDING 1: The OTA-fee ambiguity is inside the signed contract itself

This is now the single most consequential open item, and it is worse than a documentation problem —
it is an ambiguity in an **executed** agreement.

- **Part II §C.2**: Rental Proceeds for Channel bookings = nightly rate **"less fees, charges, or
  commissions imposed by the Channel."**
- **Part II §C.4**: OTA host-side fees are **"deducted from booking revenue before Rental Proceeds
  are calculated"** — Airbnb ~15.5%, VRBO ~8%, Booking.com ~15%.
- **Exhibit A**: those *same percentages* are a Booking Fee **"Charged To: Guest"**, a
  *"pass-through of OTA commission… Retained by NEHC; no markup or margin added."*

Both cannot operate simultaneously without either double-charging the OTA cost or leaving it
unrecovered. On an Airbnb booking at 15.5%, the two readings are the difference between the owner
receiving **100%** of rent and roughly **84.5%** of it.

`SOURCE CONFLICT — HUMAN REVIEW REQUIRED`. This is a signed contract, so resolving it is Will's
call and probably counsel's — not a documentation fix. Until it is settled, no statement should be
issued for 230 Lakeshore.

### 🔴 NEW FINDING 2: No executed agreement exists for the three revenue-producing properties

A complete search of Google eSignature history (**12 threads, all time**) plus Drive returns
**exactly one** executed NEHC owner agreement: 230 Lakeshore / Currier. The other eSignature threads
are all either earlier Currier rounds or the unrelated FCM matter below.

**183 Flagstone, 672 Amory and 61 Pleasant — the three properties actually earning money — have no
executed management agreement anywhere in Gmail or Drive.**

This does not prove none exists. It may be on paper, in Kyle's account, or predate the NEHC brand
under Kembo Homes. But it is not reachable from here, and it means the fee basis for every dollar
currently flowing is undocumented in any system I can see. `UNKNOWN — REQUIRES HUMAN INPUT`.

### 🟠 NEW FINDING 3: Fireflies.ai — a second, overlapping meeting-notes AI

| | |
|---|---|
| **What** | Auto-joins meetings, records, transcribes, sends a Daily Brief and pre-meeting prep |
| **Trigger** | Automatic on invited meetings — Zoom **and** Google Meet |
| **Evidence** | "Your meeting recap — The Super Property Method" (Zoom, 2026-09-10); "Meeting Prep: Kris x Will STR Discussion"; "Catch up on yesterday in 2 minutes" (2026-09-11) |
| **Overlap** | **Duplicates Gemini**, which is already auto-noting the same Google Meets |
| **Risk** | Two AI notetakers on the same calls, including the weekly mastermind with **seven operators from other companies**. Fireflies also researches attendees ("Kris Levy is a wine business owner, brand…") — i.e. it profiles third parties. |
| **Efficiency** | Paying twice for one capability. Pick one. |

### 🟠 NEW FINDING 4: An active outbound owner campaign that the CRM does not reflect

On 2026-08-17 Will sent *"A local option for your vacation rental"* as a **BCC blast to ~23 owners**
drawn from the bulk list, under a dedicated Gmail label. Two bounced (`ethan.hugo@fmr.com` invalid,
`tswaim30@icloud.com` full). At least one converted to a live conversation — Ken
(`khkhagar@gmail.com`) asked for a rental-income estimate and received the contract, services and
projections.

**Live prospect threads found in Gmail that do not appear in the CRM sheet:**

| Prospect | Property | Stage |
|---|---|---|
| **Todd Johnson MD** (`todd.johnson.md@gmail.com`) | 129 Edgerly School Rd, Meredith | Contract + projections sent; blocker is **Meredith town permitting** |
| Ken (`khkhagar@gmail.com`) | — | Contract + projections + 6 comps sent |
| `Aminlev@gmail.com` | 104 Reservoir Rd | Contract sent, **3 follow-ups, no reply** |
| Phil (`pjwesq@gmail.com`) | — | Agreement + info sent |
| Stephanie (`sjordanteam@gmail.com`) | 151 Mill St, Chatham | Full STR analysis sent |
| Kris Levy | — | STR discussion held |

⚠️ **`SOURCE CONFLICT — HUMAN REVIEW REQUIRED`:** the CRM lists the Meredith / 129 Edgerly School Rd
lead as **"Todd Robinson"**. Gmail shows **"Todd Johnson MD"** at that same address. One of them is
wrong, and it is the top row of the pipeline.

### 🟠 NEW FINDING 5: Gmail is a usable Hospitable data channel

I classified Hospitable as `NOT ACCESSIBLE IN CURRENT ENVIRONMENT`. That is true of its API — but
**Hospitable emails every reservation event to `will@` and `kyle@kembohomes.com`**: new bookings,
alterations, cancellations, and check-out reminders **including guest counts** ("Number of guests: 6"),
which PriceLabs does not expose in the bookings report.

It also captures **cancellations**, which a `booking_status: ["booked"]` query silently omits — two
Flagstone reservations were cancelled on 2026-09-14 alone (Sept 25 and Oct 24 stays). Any occupancy
or pacing analysis built only on "booked" will overstate performance.

### 🟡 NEW FINDING 6: Entity jurisdiction discrepancy

The executed Currier agreement describes NEHC as **"Kembo Homes LLC DBA New England Host Co., a
Massachusetts limited liability company."** The same Onboarding folder contains a file named
**"NH LLC Verification."** Massachusetts or New Hampshire — the signed contract and the diligence
file disagree. Governing law follows the property's state (NH/VT), so this may be immaterial, but it
is a discrepancy in an executed document. `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`.

Also: Will signs the Currier agreement as **"Partner/Operator"**; the template says "Owner/Operator".
Consistent with the in-flight 50% partnership (New Finding 7).

### 🟡 NEW FINDING 7: The partnership and ops agreement are in flight

- 2026-08-18, Kyle to `aaron@aaarchambaultlaw.com` (attorney), cc Will: *"I am looking to add Will
  to my LLC as a **50% partner**. I have created a first draft of an amended operating agreement."*
- 2026-09-14, Kyle to Will: an **Ops Agreement** drafted by that attorney, which *"included
  protections for me because this was before the Rand agreement was signed."* Will approved it
  the same day.

This confirms Kyle as business partner and shows the governance work is active, not stalled.

### 🟡 NEW FINDING 8: A vendor/legal matter — possibly not NEHC's

An **"FCM-Payment Agreement"** was sent for eSignature 2026-08-08 to Javier
(`firstclassmechanical0@gmail.com`, First Class Mechanical) with the message: *"please sign this
ASAP. Deadline to sign before taking legal action is Tuesday August 11, 2026."* Javier signed on
2026-08-11. Calendar, 2026-09-01: *"Meet Javier for the deposit."*

**Will signed it as `wrealestatenh@gmail.com` — his separate real-estate identity, not his NEHC
address.** That suggests this is Will's own real-estate business, not an NEHC liability — but the
two identities are entangled enough that I cannot tell. `UNKNOWN — REQUIRES HUMAN INPUT`.

### 🟡 NEW FINDING 9: More tools in the estate

| Tool | Status |
|---|---|
| **HostGPO** | Membership applied 2026-08-10; account manager assigned. Group purchasing — directly relevant to the recurring supply tickets. |
| **AirROI** | Evaluated — Will: *"provides the comps and charges 16 cents a comp… costly in the long run."* |
| **AirDNA** | Now actively evaluated — Will: *"I can already tell I like AirDNA's data better."* (Doc 01 listed this as UNKNOWN; it is live evaluation.) |
| **BetterSTR** | Under evaluation vs Happy Guest. Kyle: *"ChatGpt actually recommends we use both."* |
| **Higgsfield AI** | Confirmed in use — Will: *"Higgsfield AI is used for photos."* Doc 01 said no NEHC assets found. |
| **ChatGPT** | In active use by Kyle for vendor evaluation. A second LLM vendor alongside Claude. |
| **Kyle building in Claude** | 2026-08-31: *"I'm going to try building something in Claude that simplifies getting reports in front of potential clients."* **A fourth AI tool may be in flight — status unknown.** |
| **Canva** | Active account (heavy marketing mail, `canva.link` assets shared by peers). |
| **Houfy** | Account verification email 2026-08-26 — explains the Houfy Blue Lodge listing. |
| **`wrealestatenh@gmail.com`** | Will's **separate real-estate identity**. Owns the "Vacasa Homes NH" sheet; used for the FCM agreement; active in Gilford/Candor deal flow. |

---

## PART 3 — PHASE 0 CLOSEOUT

### Coverage — what was actually audited on the second pass
Google Drive (My Drive + NEHC Master shared drive + shared-with-me, folders, Docs, Sheets, PDFs) ·
**Gmail (5 targeted sweeps incl. full eSignature history)** · Google Calendar · Slack (all 7
channels incl. deep history) · PriceLabs (account, 14 listings, full-year bookings) · Zapier
(connections, actions, read **and** write verified live) · Supabase · GitHub (branches, README,
env template) · Notion · Otter · **Descript** · **Gamma** · Firecrawl.

### Still not closed, and why
| Gap | Reason |
|---|---|
| Hospitable API | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — only reachable via PriceLabs (read) and Gmail notifications |
| Turno, Waivo, Jobber, Happy Guest, HostGPO, AirDNA, Fireflies | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — no connector |
| Supabase table contents | Both projects `INACTIVE`/paused; SQL connection times out |
| Browser extensions | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — cannot be inspected remotely |
| Full per-platform OAuth grant audit | `AUTHORIZATION REQUIRED` — needs console access |
| Accounting | Out of scope by Will's instruction, 2026-09-15 |
| Owner names for the 3 active properties | Pending Will |

### The five things that actually matter now
1. **The OTA-fee ambiguity inside the signed Currier contract** — decide the reading before any statement.
2. **No executed agreements for Flagstone, Amory, Ludlow** — the fee basis for all current revenue.
3. **Ludlow unit 2 is not in PriceLabs** — unpriced and possibly undistributed, 14 weeks from Okemo peak.
4. **NEHC-0005 — Amory front door lock, High, open since 10 Aug**, with guests cycling through.
5. **Two AI notetakers on the same calls**, one of which profiles external attendees.

**Phase 0 is closed.** The portfolio, systems, automations, data locations, conflicts and unknowns
are mapped and, where I got them wrong, corrected on the record.
