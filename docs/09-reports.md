# 09 — Monthly Intelligence Report

## Goal
Automatically generate a professional, evidence-backed monthly report per market
(and an all-markets roll-up) that the operator can read, act on, and share with
owners. Stored in `monthly_reports` (structured `content` jsonb + rendered
artifact) and browsable/exportable from the dashboard.

## Generation flow
```
monthly pipeline (after engines run)
        │
        ▼
 reports/generate.ts
   - pulls materialized outputs (trends, insights, opportunities,
     recommendations, delighters, place rollups, snapshots)
   - synthesis model writes narrative sections FROM those inputs only
   - assembles structured section tree + confidence summary
        │
        ▼
 monthly_reports row  ──▶  reports/render.ts  ──▶  HTML / PDF (storage_path)
```
The synthesis model writes prose from the engine outputs; it does not invent
data. Every section that makes a claim references the underlying evidence, and the
appendix makes the citations explicit.

## Report structure (sections)
1. **Executive summary** — the month in 5–8 sentences: biggest movements, top
   opportunities, headline confidence.
2. **Top trends** — from `trend_history`, ranked by magnitude × confidence.
3. **Top opportunities** — highest-impact gaps with cost/difficulty/ROI.
4. **Market comparison** — the four lakes side by side.
5. **Traveler personas** — mix and shifts, per market.
6. **Amenity trends** — emerging delighters, table-stakes drift, rising complaints.
7. **Complaint trends** — operational/maintenance themes gaining or fading.
8. **Guest expectation changes** — what moved between table stakes and delight.
9. **Memorable experiences** — concrete, copyable delighters with frequency.
10. **Restaurants / Events / Attractions** — most-mentioned local places + sentiment.
11. **Top 25 recommendations** — full ranked list with every mandated field.
12. **Operational watch list** — issues to monitor before they hurt ratings.
13. **Confidence summary** — coverage, sample sizes, where evidence is thin.
14. **Appendix** — supporting evidence: excerpts + counts behind each conclusion.

## Confidence summary
Every report opens the books on its own certainty: how many reviews it draws on,
how coverage compares to prior months, and which conclusions are low-confidence.
This is a first-class section, not a footnote — consistent with the evidence
standard.

## Continuity
Because `recommendation_history` and `trend_history` persist, each report shows
movement vs. prior periods ("this recommendation strengthened," "this complaint is
receding"), so the operator sees a storyline, not a disconnected monthly dump.

## Formats & distribution
- **HTML** (dashboard + shareable link) and **PDF** (owner-facing brief).
- A recommendation-only **owner brief** can be exported per property/owner.
- Reports are idempotent per `(report_month, market_id)` — regenerating overwrites
  cleanly.
