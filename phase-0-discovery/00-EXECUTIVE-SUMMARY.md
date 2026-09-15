# Phase 0: Discovery — Executive Summary
**New England Host Co. (Kembo Homes LLC DBA New England Host Co.)**
Discovery date: 2026-09-15 · Read-only. No file, record, message, price, calendar, automation or permission was changed.

---

## WHERE WE ARE
Phase 0 of the AI operating system: **find out what is actually true** before designing anything. I inspected every system I could authenticate to and searched the real data inside it — not just confirmed that accounts exist. **Nothing has been built. No architecture has been committed to.**

**Verified reachable (13):** Google Drive · Gmail · Calendar · Slack · PriceLabs · Zapier · Supabase · GitHub · Notion · Otter · Descript · Gamma · Firecrawl.
**Verified in use but unreachable from here (10+):** Hospitable (the PMS — the actual system of record), Airbnb/VRBO/Booking.com, Turno, Waivo, Jobber, Scribe, Happy Guest, eseospace, Host Buddy.
**Searched for and not found:** any accounting system, any owner portal, any Make/n8n/Zap workflows, any Apps Script, any deployed code.

---

## WHAT YOU FOUND

**1. The automations everyone believes are running are not running.** The scheduler is empty — zero scheduled jobs. The daily 7am ops brief has posted **once, ever**: a sample on 12 Aug that says *"the automated version posts here every morning."* It is 34 days old. The 30-minute maintenance scan stopped on 31 Aug. Since then Slack has carried at least four untracked issues, including **the internet going out during a guest stay** and **a bees nest nobody could find**. Neither became a ticket.

**2. Owner-payment terms are in direct conflict — and this is money.** The Management Agreement in Drive says the management fee is **25%**; the owner-report tool is built on **20%**. The agreement says OTA fees are **deducted before** owner rent is calculated (Airbnb ~3%, VRBO ~5%, Booking.com ~15%); the tool says **do not deduct them**. The agreement says pet fees and early/late fees are **retained by NEHC**; the tool pays them to the owner. On $10,000 of monthly rent these readings differ by roughly **$800 in fees plus up to $300 in deductions, per property, in opposite directions**. The saving grace: **no owner statement has ever actually been delivered** — the Owner Reports folders are empty. That window closes the moment someone runs the tool.

**3. You manage three properties. That is now verified, not assumed.** 183 Flagstone (Nashua), 672 Amory (Manchester), 61 Pleasant St (Ludlow VT / Okemo) — each confirmed four ways: Slack channel, Drive folder, PriceLabs listing, and real 2026 reservations. Ludlow is seasonal, not dormant — it already has **26 Dec–1 Jan booked at $2,778**. Separately, PriceLabs holds **10 more listings with zero bookings in all of 2026** (Cape Cod, Blue Lodge, Dover Rd, Tracy Ln), and the owner-report tool lists them as your *"Known property roster."*

**4. You do not have owner names.** For none of the three active properties could I find an owner name, entity, email or signed agreement in any accessible system. The tool's own safety rule says *"confirm the owner's name from the roster"* — **there is no roster.**

**5. Strolling Woods / 230 Lake Shore Drive is mid-onboarding, not managed.** Drafted marketing says *"NEHC just took over management."* But the owner agreement is a **DRAFT**, there is no Slack channel, no PriceLabs listing, no bookings — and the same document says *"the home is not on the active-marketing list yet."* Real work is happening (photo shoot 10 Sep, 1.8 GB archive, three Descript videos on 14 Sep). It is **pre-management**. Don't publish the announcement yet.

**6. Single points of failure.** The live Maintenance Tracker is readable by **exactly one person — you**. Not Kyle, who is assigned five of the seven open tickets. PriceLabs — pricing for every property — is registered to **`michaudkyle@gmail.com`**, a personal account. The Management Agreement, the tracker and the revenue report sit loose in your personal My Drive, not the shared drive.

**7. What's genuinely strong.** Reservation data is clean and trustworthy. The three skills are **well built** — careful guardrails, explicit "never invent" rules, real dedupe logic. Slack-based property ops works. The content engine is producing real volume. GDIP is a serious, well-documented platform design with a runnable schema and 27 passing tests. **The raw material here is good. It is not wired together.**

---

## WHAT YOU RECOMMEND
Fix the knowledge layer before building any brains. Specifically, in order: **(1)** settle the fee terms, **(2)** restart ticket capture and add the Ludlow channel, **(3)** run the digest as a plain script with no AI, **(4)** collapse the three maintenance trackers into one and give Kyle and Dorcas access, **(5)** build a property registry with one stable ID per property, **(6)** capture owner identities and signed contracts, **(7)** move critical documents and PriceLabs onto company accounts, **(8)** freeze the owner-report batch mode until the 10 dormant listings are classified.

---

## WHY
Because the destination is right and the order was wrong. Six brains over today's data would **industrialise the conflicts**, not resolve them — you'd get the 20%-vs-25% problem repeated at scale, faster, in owner-facing documents.

The fee conflict exists for a specific, fixable reason: **the fee percentage was written into a prompt instead of stored as data.** That is the lesson the whole architecture should inherit — facts live in tables, prompts hold judgment.

**On cost, plainly:** 11 of the 18 automation candidates need no AI at all. The daily digest is a database query, a date comparison and a fill-in-the-blank template — running it as a full AI session is like hiring an analyst to read a clock. Making it a script takes its AI cost to zero and makes it *more* reliable, because scripts don't improvise. Reserve real reasoning for what actually needs judgment: triaging a message from Melissa, drafting a review response, deciding if an issue is guest-affecting.

---

## WHAT YOU ARE BUILDING NEXT
**Nothing, until you've read this and made the P0 calls.** When you greenlight: the **verified knowledge layer** first — property registry, owner registry, vendor registry, cached reservations, contract terms as data, and an append-only event log. Then the deterministic digest and the restarted ticket capture on top of it. No new AI agents in this phase.

---

## WHAT YOU NEED FROM WILL
Five decisions. Everything else I researched myself.

**1. Owner terms — which is correct?** Is the management fee **20% or 25%**? Are OTA fees deducted before owner rent, or is rent whole? Do pet fees and early/late fees go to the owner or to NEHC? The best resolution is simply sending me the **executed agreements** for the three properties (plus any Exhibit A). *Blocks all owner reporting.*

**2. Who owns each property?** Names and contacts for 183 Flagstone, 672 Amory, 61 Pleasant. *Blocks every owner-facing feature.*

**3. The 10 dormant PriceLabs listings** — historical, former clients, or test records? *Blocks safe use of the owner-report tool.*

**4. Where does accounting live?** I found no QuickBooks, Xero, Stripe or bank data anywhere. Is there a system I can't reach, or is this genuinely on paper? *Blocks any real financial reporting.*

**5. Two quick confirmations:** What is **Beata Balazsi's** role at 61 Pleasant — owner, cleaner, or local contact? And is Ludlow **one unit or two** (you told Dorcas "2 new units" in January; PriceLabs shows one, and the Happy Guest form says "5 active units")?

---

## HOW WE WILL TEST IT
Every property resolves across all four systems through one ID. The digest runs in shadow for a week and is diffed against what Kyle would have written — zero invented arrivals. The ticket agent replays September's four missed Slack issues and produces exactly four correct tickets with zero duplicates against NEHC-0001…0011. **Owner statements are recomputed by hand and by tool and must match to the cent before one is ever sent.** The authority gate is tested by *trying* to send a guest message, change a price and post to a vendor channel — all three must block. And I'll inject a missing data source to confirm the system says **"I don't know"** instead of guessing.

---

## WHAT COULD GO WRONG
**The one that matters most:** someone runs the owner-report tool before the fee conflict is settled and sends an owner a statement built on the wrong percentage. That is a refund and a trust problem with a client. **Treat that tool as frozen until decision #1 is made.**

**Others, ranked:** the Zapier paid trial ended 26 Aug and the ticket system's only verified write path runs through it — it can fail silently. The maintenance agent has **write access into Slack channels that contain external vendors**, so a bad automated post goes to third parties. PriceLabs writes push live to Hospitable and out to the OTAs, where a wrong price gets booked against immediately and cannot be recalled — which is why pricing stays read-mostly for now. Ludlow has **no identified cleaner** and no ticket coverage while carrying a booked holiday week. The abandoned shower remodel at 672 Amory (contractor "Winston") is unresolved and flagged over $500. And Gemini is auto-generating notes on your weekly mastermind calls with **seven operators from other companies** — nobody chose that.

**The quiet one:** believing a system is running when it isn't is more dangerous than having no system. `#dashboard` currently tells your team that a brief arrives every morning. It doesn't. That gap is where an issue gets missed.

---

### Documents in this package
`01` System Inventory · `02` Drive Audit · `03` **Automation & AI Agent Register** · `04` Data Map · `05` Org/Property/Owner/Vendor Maps · `06` Operational Maps · `07` **Unknowns & Source Conflicts** · `08` Security & Permissions · `09` Automation Backlog · `10` Architecture & Roadmap

*Labels used throughout per the Phase 0 standard: `UNKNOWN — REQUIRES HUMAN INPUT`, `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`, `NOT ACCESSIBLE IN CURRENT ENVIRONMENT`, `AUTHORIZATION REQUIRED`, `HUMAN APPROVAL REQUIRED`. No property, owner, vendor, rate, revenue figure or capability in this package was inferred — every figure traces to a live read.*
