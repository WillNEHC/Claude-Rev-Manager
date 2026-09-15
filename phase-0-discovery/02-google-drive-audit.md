# 02 — Google Drive Audit
**Access:** `will@newenglandhostco.com` · verified read across My Drive, the NEHC Master shared drive, and shared-with-me items.

## A. The two-root problem

NEHC's files live in **two parallel, partially duplicated trees**:

```
[SHARED DRIVE] NEHC Master            (10l3Q5lSl_HOg4aVnDPatoNg_ky4vzzur)
├── Properties                        (1kQeW0soakhcrhGhreMpYfgzi-lPK10Q4)
│   ├── TEMPLATE_Property Folder      ← the standard: Info Sheet / Cleaning Checklist /
│   │                                    Photos and Marketing / Invoices-Receipts / Supply List
│   ├── 183 Flagstone                 ← + Legal-Permits, Supply List
│   ├── 672 Amory Street              ← + Legal-Permits, Supply List
│   ├── 61 Pleasant St_Ludlow         ← + Supply List
│   ├── Atherton Ave_Nashua           ← + Maintenance, Cleaning Checklist, Invoices-Receipts, Supply List
│   └── Currier - 230LakeShoreDr      ← FULL template incl. Owner Reports, Maintenance and
│                                        Work Orders, Onboarding  (created 2026-08-29)
├── Marketing & Growth
│   └── CLAUDE TOOLS MASTER           (1M70v4sCMHXeR0L437MVuUGrAgVVX1idi)
│       ├── Content Vault → FB-Insta → Carousels, NEHC Carousels - By Property,
│       │                              NEHC Photos, NEHC Area Photos
│       ├── STR MASTERMIND NOTES
│       ├── Meet Recordings
│       └── STR Rev Projections → CMA's
├── Operations                        (1bSlMiO9JH_QmWeJA7ujxZzIVuHSH_dIV) — last modified 2026-04-14
└── Property Onboarding               (1-ytQeYdwF_3pxB2C_n5KR-KCjTpidNDR)
    ├── NEHC_Property_Onboarding_SOP
    └── NEHC_Onboarding_Checklist

[MY DRIVE] will@newenglandhostco.com  (0ALFHdzwdCRrTUk9PVA)
├── CLAUDE TOOLS MASTER               (1iNhAGH4izgNyP0olZGaXGrMjTCProuQN)   ⚠ DUPLICATE NAME
│   ├── Content Vault → FB/Insta → NEHC Carousels (Franklin/Manchester/Nashua×2)  ⚠ DUPLICATE
│   ├── STR MASTERMIND NOTES          ⚠ DUPLICATE
│   ├── Meet Recordings               ⚠ DUPLICATE
│   ├── STR Rev Projections → CMA's   ⚠ DUPLICATE
│   ├── Google Meet
│   └── Saved from Chrome
├── LakeShoreDrive-Franklin → History Book
└── (loose, at My Drive root — no folder):
    NEHC - STR Management Agreement · NEHC Maintenance Tracker (Live) ×2
    Strolling_Woods_Marketing_Package.md · Strolling_Woods_Reviews
    NEHC_Tailored_Owner_Emails · STR Revenue Report — June 2026
    Webster-Lake-Estate-Listing.md · will-str-audit · STR SUMMIT CLAUDE
    Copy of Deal Analysis Toolkit · Untitled spreadsheet
```

**Finding D-1 — "CLAUDE TOOLS MASTER" exists twice**, once in the shared drive and once in Will's personal My Drive, with near-identical child folders (Content Vault, STR MASTERMIND NOTES, Meet Recordings, STR Rev Projections). The My Drive copy is the older original (created 2026-06/07); the shared-drive copy was created 2026-08-10. Neither is marked authoritative. `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`.

**Finding D-2 — the company's most important documents sit loose in one person's personal My Drive**, not in the shared drive: the **Management Agreement**, the **live Maintenance Tracker**, the **owner-email spreadsheet**, and the **June 2026 revenue report**. If Will's account is lost or he is unavailable, the team cannot reach them. This also makes them invisible to Kyle and Dorcas by default (confirmed — see doc 08).

## B. Authoritative documents identified

| Document | ID | Owner | Modified | Assessment |
|---|---|---|---|---|
| **NEHC - STR Management Agreement** | `1R1bFFDmw4CSRswBMPs5oiA9W1QOmcTT2P6Ry9-qxylw` | will@ | 2026-08-10 | **Authoritative contract template.** Blank signature blocks, `[list all legal owners]`, `[address]` — it is an **unexecuted template**, not a signed instrument. Conflicts with the owner-report skill — see doc 07 §Conflict C-1. |
| **NEHC Maintenance Tracker (Live)** | `1pH3jclgVvOtXww-ws-VnA5bdS-ZYrYakXv1omlJlFjw` | will@ | **2026-08-31** | **Current source of truth for tickets** (NEHC-0001…0011). Stale by ~2 weeks — see doc 06. |
| NEHC Maintenance Tracker (Live) — *same name* | `1EOIlrQkLELjJYn7Kd2gjSLoNaEmHyN8fpC000I-T-4I` | will@ | 2026-08-12 | **Superseded** pre-Ticket-ID version. Identical title = live confusion risk. |
| Maintenance_Tracker_New England Host.xlsx | `1jc2_l_7OOWNH-u7E9jJDE1vGtK-cZ57_` | **dorcas@** | 2026-09-14 | **Third copy, and the most recently touched (Sept 14).** The owner-report skill points at *this* file for repair costs while the ticket skill points at the Google Sheet. `SOURCE CONFLICT — HUMAN REVIEW REQUIRED`. |
| **NEHC Owner CRM** | `1DJKTpTKk37BAgR6NBMjLqlWxkISzMyb74OTEMP56bJ4` | kyle@ | 2026-08-11 | Authoritative pipeline. ~180 rows: **4 qualified leads with status; ~176 rows are a bulk owner list with no status/source/date.** See doc 05. |
| NEHC_Property_Onboarding_SOP | `1famHL16BM2wn6bA-VTTrtaFdo5zqq9_eKMucMAaUxfI` | shared | 2026-08-29 | 319 KB. Newest SOP. |
| NEHC_Onboarding_Checklist | `19sqjNzs6HjdinP1pAaTre3wMGX0WVSp5e61tIBst3no` | shared | 2026-09-01 | Companion tracker. |
| NEHC Business Structure | `1Qxf5J7lUT9JHVcLpuNe_P5xzHk9m5N3K7MGUkOBI7Uc` | kyle@ | **2026-04-07** | Org/function map. **5 months stale**; still says "VA" for roles now held by named people, and lists PMS as "Guesty, Hospitable, etc." |
| Kembo Homes — Operations SOP & VA Checklists | `1BjDBbUk13hsb1KzGJXLF2NbpC42iZqfTzE7FZI3TKaE` | kyle@ | 2026-03-24 | Older SOP under the **Kembo** brand. Title ends "…VA ChecklistsUntitled document" — unfinished. |
| Amended & Restated Operating Agreement, Kembo Homes LLC | `1T0D4j1OFwIj13B7HnIxSpH45TGnAbj7M3pNeoqs3gU0` | kyle@ | 2026-08-18 | Entity governance. "Attorney review" still open on the To-Do sheet. |
| 230_Lakeshore_Dr NEHC Owner Agreement **Proposed Revisions DRAFT** | `1OM3DseG5orkEowzu3sI_UoTBoE7hX4G00O3a1OsHFeA` | kyle@ | 2026-08-28 | **DRAFT** — central to Conflict C-2 (doc 07). |
| 🤖 New England Host Co Brand Dossier | `18Cc-N6at_9fEg-JK6fJj3efSHWpTOZ8xF99axMgJ1gM` | will@ | 2026-07-04 | Brand/voice source. Derived from a `rachel@shorttermgems.com` template. |
| Will/Kyle To Do | `1ptiI0F4eByDHUs0OiL6qUZlBufDAzeWqoHwVsHOnAFo` | kyle@ | 2026-08-19 | **The de facto company project list.** 12 items, mostly unassigned/undated. See doc 06. |

## C. Duplicates, near-duplicates and version drift

| Cluster | Copies | Risk |
|---|---|---|
| Maintenance tracker | **3** (Google Sheet live, Google Sheet superseded, .xlsx by Dorcas) — two share an identical title | **High — money.** Owner statements read repair costs from here. |
| CLAUDE TOOLS MASTER tree | 2 full trees (My Drive + shared drive) | Medium — content divergence |
| Property info sheets | `183 Flagstone Info Sheet` + `672 Amory Info Sheet` are owned by **michaudkyle@gmail.com** and live *outside* the NEHC Master property folders, linked only from Slack channel topics | Medium — offboarding/continuity |
| Social captions | 6+ overlapping caption docs incl. explicit v1/v2 pairs ("Voice Captions 1" vs "…(v2 no address)"; "POST-READY CAPTIONS v2 (luxe)" vs "…(FINAL)") | Low — but no naming convention |
| Franklin / Lake Shore Drive | 5 separate folders across both roots: `Currier - 230LakeShoreDr`, `230 LakeShore Drive Franklin`, `230 Lakeshore Drive, Franklin, NH`, `LakeShoreDrive-Franklin`, `Franklin - Lake Shore Drive` (containing `carousel-strolling-woods`) | **High — identity.** Same asset, five names, two brands ("Currier", "Strolling Woods"). |

## D. Gaps — what is NOT in Drive

- **No financial system of record.** No P&L, no ledger, no owner-payout register, no bank/accounting export. The only financial artifacts are `STR Revenue Report — June 2026` (one month, 3 months stale) and furnishing/deal estimates.
- **No completed owner statements.** `Owner Reports` folders exist (e.g. `1P-0VcH_7ILhQiWFkIh9_wo9s_esa_HYt` under Currier) but **contain no statements**.
- **No signed/executed management agreements** for any of the 3 active properties — only the blank template and one draft revision.
- **No guest data, no review archive** (other than `Strolling_Woods_Reviews`, which is for a property not yet confirmed live).
- **No vendor list, no insurance certificates, no W-9s, no permits** (Legal-Permits folders exist for 183 Flagstone and 672 Amory but returned no documents).
- **No cleaning checklists actually filled in** — the folders exist per the template; content not found.
