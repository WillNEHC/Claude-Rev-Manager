# 05 — AI Processing Pipeline

## Goal
Convert each raw review into a single, validated, structured record plus a set of
citation-grade "mention" edges, so the intelligence engines aggregate over clean
signal instead of raw text. Extraction happens once per review and is idempotent.

## Model roles
- **Extraction model** (`GDIP_EXTRACTION_MODEL`, default a fast/cheap Claude): high-volume, per-review structured extraction via tool-use / JSON schema.
- **Synthesis model** (`GDIP_SYNTHESIS_MODEL`, default Claude Opus): lower-volume narrative synthesis — market insights, report prose, recommendation explanations.

Cost scales with review volume, so the cheap model does the per-review work; the
expensive model only runs on aggregated inputs.

## Processing flow
```
reviews WHERE is_processed = false
        │  (batched)
        ▼
  build prompt (review body + listing/market context)
        │
        ▼
  Claude structured extraction (tool schema == ai/schema.ts)
        │
        ▼
  Zod validation ─── fail ──▶ quarantine + log (never write partial garbage)
        │ pass
        ▼
  transaction:
    upsert review_extractions
    insert amenity_mentions / review_categories / review_personas
           operational_issues / guest_delighters / place_mentions
    set reviews.is_processed = true, processed_at = now()
```
Every LLM output is validated against a Zod schema mirroring the
`review_extractions` table before anything is written. Invalid outputs are
quarantined and retried, never silently coerced.

## Extraction schema (what we pull from every review)
The extractor returns fields mapping to `review_extractions` + the mention
tables. Nullable = "not mentioned" (absence is signal too).

**Trip context**
- review date · rating · property · location · host · superhost status
- trip purpose · reasons for booking · reasons to return · reasons not to return

**Experience dimensions** (scored where present)
- sentiment (polarity + score) · cleanliness · communication · check-in · check-out
- value · design · outdoor areas

**Feature/amenity signals** (→ `amenity_mentions`, positive/negative)
- kitchen · bedrooms · bathrooms · dock · lake access · beach · parking
- internet/Wi-Fi · technology · hot tub · fire pit · and any amenity named

**Audience signals** (→ `review_personas`)
- children · pets · accessibility · family / couples / luxury / remote work /
  business / fishing / boating / multi-gen / seasonal

**Issues & delights**
- operational issues · maintenance issues (→ `operational_issues`, with severity)
- unexpected delights · memorable moments · hidden gems (→ `guest_delighters`)

**Places** (→ `place_mentions` → `local_businesses`)
- restaurants · coffee shops · breweries · attractions · events · wedding venues
- activities: fishing · boating · snowmobiling · leaf peeping · skiing

**Highlight phrases (verbatim, used as evidence)**
- phrases indicating exceptional experiences (`is_exceptional`)
- phrases indicating disappointment (`is_disappointment`)

**Self-assessed confidence**
- `extraction_confidence` — the model's own certainty, propagated downstream so
  weak extractions carry less weight in aggregation.

## Traveler-persona classification
- Seed personas are pre-loaded (migration 0005): families, couples, wedding
  guests, luxury travelers, pet owners, remote workers, business travelers,
  fishing/boating groups, friends' trips, multi-gen families, seasonal visitors.
- Each review is tagged with 0..n personas + confidence + supporting excerpt.
- **Emergent personas:** when the classifier repeatedly needs a persona not in
  the seed set, it proposes one. New personas enter `traveler_personas` with
  `is_confirmed=false` and are promoted only once evidence count crosses a
  threshold — data-driven, reviewable, not hallucinated into permanence.

## Categorization
Every review is classified into 0..n standardized categories (Amenities, Guest
Experience, Host, Communication, Cleanliness, Design, Outdoor Experience,
Location, Restaurants, Activities, Events, Maintenance, Parking, Technology,
Value, Family Experience, Luxury, Accessibility, Pets), each with sentiment,
confidence, and an excerpt. Categories are hierarchical, so sub-signals (Dock,
Beach, Lake Access) roll up to Outdoor Experience.

## Embeddings (RAG substrate)
After extraction, review text is chunked (long reviews split) and embedded into
`review_embeddings`; selected synthesized objects embed into `insight_embeddings`.
Details in [`07-search-rag.md`](07-search-rag.md).

## Idempotency, versioning, reproducibility
- `review_extractions.schema_version` + `model` are stored, so re-processing under
  a new schema/model is auditable and selective.
- Re-running extraction only touches `is_processed=false` rows unless a targeted
  reprocess is requested (e.g., schema bump) — controlled, not accidental.
- `raw` jsonb preserves the full model output for every review for audit and
  future re-derivation without re-calling the model.

## Quality controls
- Deterministic decoding (low temperature) for extraction.
- Golden-set fixtures: a curated set of reviews with hand-labeled expected
  extractions; extraction tests assert structural + key-field correctness
  (see [`10-roadmap.md`](10-roadmap.md) testing plan).
- Confidence thresholds: mentions below a floor are stored but flagged and
  down-weighted by the engines rather than discarded (preserves recall, protects
  precision of conclusions).
