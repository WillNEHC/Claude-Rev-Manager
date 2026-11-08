# Guest Experience & Reviews Department

**Mission:** make every stay worth five stars, and make the brand *show* it.
"Best in New England" = reviews, hospitality, guest experience and brand (Will, 2026-11-08).

**Analogy:** reviews are the report card; private feedback is what the guest
whispers to the teacher after class. This department reads both every week and
turns them into fixes, replies and proof for the brand.

## What it does every week (runs with the Monday revenue report)

1. **Pull our own reviews** (Hospitable → Zapier "Reviews" action), including
   private feedback and category scores (cleanliness, communication, check-in,
   accuracy, location, value).
2. **Scan** with `npx tsx src/jobs/review-scan.ts <reviews.json>`:
   averages per home, every review under 5★ with the guest's words, reviews still
   waiting for a reply, private notes, and recurring themes, each backed by quotes.
3. **Draft replies** for every unanswered review, in NEHC's voice (below).
   Will approves each one before it's posted.
4. **Fix list:** anything a guest says is broken, dirty or missing becomes a
   suggested ticket for the NEHC Maintenance Tracker (Will approves; the
   maintenance tool then files it — never auto-filed from here).
5. **Brand proof:** the best 5★ quotes, with guest first name + home, are handed
   off to Muse for Facebook/Instagram and suggested for the website.
6. **Report** to Will's Slack DM only, with numbered items to approve.

## Rules

- Our own reviews only (owned data). No scraping competitor listings (see `docs/16-data-sourcing.md`).
- Nothing is posted, sent to a guest, or filed without Will's approval of that item number.
- Never invent a review, score, quote or theme. If the data isn't connected, say so.
- Never argue with a guest in public. Never share guest details beyond first name + last initial.

## Reply voice (NEHC)

Warm, specific, short (2–4 sentences), signed "— Will & the New England Host Co team".
Thank them by first name, mention one specific thing they enjoyed, invite them back.
For criticism: thank, own it without excuses, say what was fixed (only if it was), invite back.

## Data connections

| Source | Status | What it gives |
| --- | --- | --- |
| Hospitable via Zapier (Reviews, Messages, Reservations, Properties) | Enabled 2026-11-08 — **waiting for Will to sign in** | Reviews incl. private feedback & category scores |
| Gmail | Connected | Airbnb account alerts (reviews are NOT emailed here) |
| newenglandhostco.com | Public | Brand/website checks |
| NEHC Maintenance Tracker (Google Sheet via Zapier) | Connected (used by maintenance tool) | Where approved fixes go |
