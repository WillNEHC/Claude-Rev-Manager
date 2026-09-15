# 01 — Master System Inventory
**Phase 0 Discovery · New England Host Co. (Kembo Homes LLC DBA New England Host Co.)**
Discovery date: 2026-09-15 · Method: direct authenticated API/MCP calls only. Nothing below is inferred from a vendor list; every "verified" row was proven by a live read.

Legend for access: **R** = verified read. **W?** = write tooling exists but was NOT exercised (discovery is read-only). **—** = not available.

## A. Verified accessible — read confirmed this session

| System | Identity / account | Verified via | R | W? | Notes & risk |
|---|---|---|---|---|---|
| **Google Drive** | `will@newenglandhostco.com` | folder + file reads | ✅ | ✅ | Two roots: Shared Drive **"NEHC Master"** (`0AJOntjIYaTPEUk9PVA`) and Will's **My Drive** (`0ALFHdzwdCRrTUk9PVA`). See doc 02. |
| **Gmail** | `will@newenglandhostco.com` | thread search | ✅ | ✅ | Send/draft/trash tooling present. Not used. |
| **Google Calendar** | `will@newenglandhostco.com` | event list | ✅ | ✅ | Only 2 calendars: Will's primary + US Holidays. **No shared ops/cleaning/owner calendar exists.** |
| **Slack** | `kembohomes.slack.com` · Will = `U0B1V989SA3` | channel list + history | ✅ | ✅ | 7 channels total (5 operational). See doc 06. |
| **PriceLabs** | acct `74254` — **`michaudkyle@gmail.com`** | `get_me`, listings, bookings | ✅ | ✅ | `dynamic_pricing: subscribed`. 14 listings. PMS = `smartbnb` (Hospitable). **Revenue system is on a personal Gmail, not a company account — see doc 08.** |
| **Zapier (MCP)** | 3 connected apps | action inspection | ✅ | ✅ | Google Sheets (`will@`), Instagram for Business (`social@`), Facebook Pages (`social@`). **Paid trial ended 2026-08-26.** |
| **Supabase** | org `vrxvphoictakpabayrwz` | project list | ✅ | ✅ | 2 projects, **both `INACTIVE` (paused)**. SQL connection timed out — consistent with paused state. |
| **GitHub** | `WillNEHC` | repo/branch/file reads | ✅ | ✅ | 1 repo: `WillNEHC/Claude-Rev-Manager`. 2 branches. See doc 03. |
| **Otter.ai** | Will Robichaud, `will@` | user info + search | ✅ | — | **Zero meetings stored.** Connected but empty. |
| **Notion** | connected workspace | search | ✅ | ✅ | **Contains only Notion's stock template pages** ("Your first doc", "Website Redesign", "New task"). **No NEHC data whatsoever.** |
| **Descript** | drive connected | project list | ✅ | ✅ | 4 projects — 3× Strolling Woods (created 2026-09-14), 1× Manchester Sauna (2026-08-09). |
| **Gamma** | workspace connected | gamma list | ✅ | ✅ | 2 docs: "Lakes Region Offseason — 1:1 Social Set" (Aug 23) + Gamma's own tips deck. |
| **Firecrawl** | keyless/hosted session | tool availability | partial | — | Available as a capability. No NEHC-owned data stored in it. |
| **Higgsfield AI / Zoom** | connected | — | — | — | Connectors present; **no NEHC company records found or expected in them.** Zoom appears only as third-party webinar links on Will's calendar. |

## B. Systems the business demonstrably uses — NOT connected to this environment

These were discovered *inside* the data (Slack messages, skill definitions, calendar invites, contracts). Each is a live dependency with **no programmatic reach** today.

| System | Role | Evidence | Status |
|---|---|---|---|
| **Hospitable** (`smartbnb`) | **The PMS — system of record for reservations, guests, messaging** | PriceLabs `pms_name: smartbnb`; Slack: Dorcas requesting Hospitable "Metrics" access (2026-03-02) | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` — reached only *indirectly and read-only* via PriceLabs |
| **Airbnb / VRBO / Booking.com / Houfy** | Distribution channels | PriceLabs channel IDs per listing | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` (visible only through PriceLabs) |
| **Turno** | Cleaning/turnover scheduling | Named in `nehc-ops-digest` skill: "Turno is NOT connected to Claude" | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` |
| **Jobber** | Cleaner's own scheduling tool | Slack #183-flagstone, Fernanda Cruz: "I will update my jobber to 1pm" (2026-09-01) | Third-party (vendor-owned). Not NEHC's. |
| **Waivo** | Damage-claim / security-deposit protection | Slack #damage-claims, Dorcas filing claims (Mar 2026) | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` |
| **Scribe** | SOP capture / process documentation | Slack #damage-claims: "I see the steps to download the reservation data on scribe" | `NOT ACCESSIBLE IN CURRENT ENVIRONMENT` |
| **Happy Guest** | Guest-experience vendor — **onboarding started 2026-09-04** | Calendar: "💚 Kyle Michaud - Happy Guest Onboarding", `rebecca@happyguest.com`; form data recorded **"# Of Active Units: 5, PMS: Hospitable"** | Onboarding in progress |
| **Host Buddy** | Under evaluation | "Will/Kyle To Do" sheet: "Evaluate/Implement Host Buddy" | Not started |
| **eseospace** | Website / direct-booking vendor | Calendar 2026-09-17 "Kyle & Irina Meeting", `hello@eseospace.com` | Active engagement |
| **AirDNA** | Market data | Marketing email only; no account activity found | `UNKNOWN — REQUIRES HUMAN INPUT` |
| **Rankbreeze** | Listing optimization | **No evidence of any account or use found anywhere** | `UNKNOWN — REQUIRES HUMAN INPUT` |
| **QuickBooks / Xero / Stripe** | Accounting / payments | **No evidence found in any audited system** | `UNKNOWN — REQUIRES HUMAN INPUT` — see doc 07, Unknown #3 |
| **Dropbox / OneDrive / Outlook / Teams / Todoist** | — | **No evidence of use.** Google Workspace + Slack are the stack. | Not in use (assessed) |
| **NoiseAware / Ring / Wi-Fi smart locks** | Required in-home tech per contract §B.6 | Management Agreement Part I §B.6 & §A.10 | Physical devices; no integration |
| **Google Gemini (Workspace)** | **Auto-generates meeting notes** | 6 "Notes by Gemini" Docs; `gemini-notes@google.com` emails | **ACTIVE AI automation** — see doc 03 |

## C. Identity sprawl — accounts in play

Three email domains and one personal account are all load-bearing:

| Identity | Used for |
|---|---|
| `will@newenglandhostco.com` | Drive owner, Gmail, Calendar, Zapier→Sheets, GitHub, Otter, Slack |
| `kyle@newenglandhostco.com` | Owner CRM, business-structure docs, owner agreements, property folders |
| `dorcas@newenglandhostco.com` | Owns the **Maintenance_Tracker .xlsx** archive |
| `social@newenglandhostco.com` | Instagram + Facebook Pages (via Zapier) |
| `kyle@kembohomes.com` | **Kyle's Slack identity** — different domain from his Google identity |
| `support@kembohomes.com` | **Dorcas's Slack identity** — different domain from her Google identity |
| **`michaudkyle@gmail.com`** | **PriceLabs account owner**; also owns "183 Flagstone Info Sheet", "672 Amory Info Sheet", "Property Walkthrough", "Kembo Homes Leads" |
| `info@sagegrovehousekeeping.com` | Melissa Ferranti — housekeeping partner (external) |
| `nanda.pandah97@gmail.com` | Fernanda Cruz — cleaner (external, personal account) |

**Risk:** the same human appears under two different identities depending on system (Kyle: `kyle@newenglandhostco.com` vs `kyle@kembohomes.com` vs `michaudkyle@gmail.com`). Any future identity-based routing, permissioning, or audit trail must reconcile these first.
