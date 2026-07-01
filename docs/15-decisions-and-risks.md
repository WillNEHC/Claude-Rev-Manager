# 15 — Decisions Log & Risks

Honest accounting of the decisions made, the ones still open, and the real risks.
Kept in the repo so choices are traceable and revisitable.

## Decisions made (with rationale)
| # | Decision | Rationale |
|---|---|---|
| D1 | TypeScript / Next.js full-stack | One language end-to-end; easiest for a solo operator; first-class Supabase + Vercel. |
| D2 | Supabase (Postgres + pgvector) as the single datastore | Relational core *and* vector search in one place; RLS; generated types. |
| D3 | Haiku 4.5 for extraction, Opus 4.8 for synthesis | Extraction cost scales with corpus; the cheap model makes a 200k backfill ~$235 instead of thousands. |
| D4 | Evidence table as a hard structural dependency | Makes "every claim cites evidence" enforceable via invariant tests, not a convention. |
| D5 | Config-driven markets/filters/taxonomy (YAML) | New market = a config edit; satisfies "expand without rewrites." |
| D6 | Content-hash dedup + append-only snapshots | Satisfies "never duplicate reviews" and "preserve history indefinitely" structurally. |
| D7 | Planning-first delivery | Settle architecture and schema before writing app code (this package). |

## Open decisions (need an answer before/within their phase)
| # | Question | Options | Recommendation | Needed by |
|---|---|---|---|---|
| O1 | Embedding model & vector dim | OpenAI 1536 vs. others | Start OpenAI `text-embedding-3-small` (1536); cheap, good. Swapping later = re-embed. | Phase 2 |
| O2 | Scheduler | Supabase cron / GitHub Actions / Vercel Cron | GitHub Actions (visible logs, easy secrets) for monthly batch. | Phase 3 |
| O3 | Report rendering | HTML→PDF lib choice | Decide at Phase 4; keep sections as structured JSON so the renderer is swappable. | Phase 4 |
| O4 | PriceLabs depth | Enrich snapshots only, vs. drive ROI models | Start enrichment-only; expand once recs need harder revenue numbers. | Phase 5 |
| O5 | Hosting | Vercel vs. self-host | Vercel for the dashboard; jobs can run anywhere (CLI entrypoints). | Phase 4 |

## Risks & mitigations
### R1 — Source Terms of Service (highest-attention)
Airbnb, Vrbo, and Booking.com prohibit scraping in their ToS, rate-limit
aggressively, and change page structure. This is a genuine business and technical
risk, not a footnote.
- **Mitigation:** respect robots directives and rate limits; keep volumes modest; prefer official/permitted access or licensed data where it exists; treat review sources with clearer reuse terms (Google, Reddit, forums, blogs, destination sites) as first-class, not fallback. Adapters are per-source so a source can be disabled without touching the pipeline. The decision to enable each source is explicit and configured, made with eyes open. Consult counsel before commercial-scale collection.
- **Residual risk:** a source may block or break; the modular design contains the blast radius to that adapter.

### R2 — Extraction quality / hallucination
LLM extraction can misattribute or invent.
- **Mitigation:** Zod validation of every output; golden-set fixtures + tests; per-mention confidence that down-weights weak signal; the evidence spine means every conclusion is checkable against the actual quote. Bad extractions degrade a stat's confidence, they don't silently fabricate a recommendation.

### R3 — Small-sample false trends
Early on, thin data can look like movement.
- **Mitigation:** sample_size travels with every trend point and insight; low-sample items are labeled low-confidence and visually de-emphasized; the evidence standard forbids overstating certainty.

### R4 — Cost runaway on backfill / reprocess
A naive re-extract of the whole corpus re-bills everything.
- **Mitigation:** Batch API, prompt caching, `schema_version`-gated reprocessing, per-job budget ceilings, and persisted counts with alerts.

### R5 — Place-name resolution noise
Free-text restaurant/attraction names are messy ("The Common Man" vs "Common Man").
- **Mitigation:** trigram fuzzy match against `local_businesses` within a market before creating; a resolution review surface can be added if noise is high.

### R6 — Schema evolution
The extraction schema will change as the taxonomy grows.
- **Mitigation:** `schema_version` + `model` stored per extraction; `raw` output preserved for re-derivation without re-calling the model; migrations are the source of truth.

### R7 — Single-operator bus factor
One power user, one maintainer.
- **Mitigation:** strong docs (this package), config-driven behavior, comprehensive tests, and a conventional stack so the project is picked up easily by anyone.

## Explicitly out of scope (V1)
Booking engine / PMS features; multi-tenant billing/onboarding; real-time
(sub-minute) updates; automated actions on source platforms. The architecture
leaves the door open (RLS on, modular adapters) without paying for these now.
