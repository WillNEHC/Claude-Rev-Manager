# STR comping agent

Pulls comparable listings from AirROI and builds a self-contained
**Short-Term Rental Income Analysis** report (HTML + PDF) for a subject property.

## Run

```bash
pip install requests
# put AIRROI_API_KEY=your_key in .env (or .env.local) at the repo root -- see .env.example
python3 str-comping-agent/run.py str-comping-agent/subjects/81-timberlane-wolfeboro.json
```

Outputs:
- `output/<output_name>.html`: report with every photo embedded as base64 (works offline, in email, in PDF)
- `output/<output_name>.pdf`: printed from the HTML with headless Chrome/Chromium (set `CHROME_PATH` if it isn't found)
- `output/data/<slug>/*.json`: raw AirROI responses and `summary.json`

Rebuild from saved responses without new API charges:

```bash
python3 str-comping-agent/run.py SUBJECT.json --from-raw output/data/<slug>
```

## What it does

1. Geocodes the subject address (US Census geocoder) unless `lat`/`lng` are set in the subject file.
2. AirROI `GET /calculator/estimate` at the subject: location revenue estimate, percentiles,
   12-month revenue distribution and the comparable listings behind it.
3. Comp candidates, one of two modes set in the subject's `criteria`:
   - `radius_search` (preferred): AirROI `POST /listings/search/radius` around the subject, entire homes in the
     bedroom and guest ranges with the listed amenity codes (for example `waterfront`, `lake_access`, `boat_slip`).
     Pulls every page (10 per page), so the whole matching pool is considered.
   - otherwise: AirROI `GET /listings/comparables` at the subject, then at each backup town, once per bedroom count.
4. Filters to the criteria: bedrooms, guests, has trailing-12-month revenue, optional `require_water`,
   `min_reviews`, `min_rating` and `min_nights_booked` (so a nightly rate only counts if it was actually booked).
   Ranks by `rank_by`: `"revenue"` (AirROI 12-month revenue, highest first, top performers), `"adr"` (AirROI nightly rate, highest first, premium tier) or `"town"` (town priority,
   then lake or dock signal, rating and reviews). Keeps the top N. Comps with more bedrooms than the subject are
   labeled "Larger home" on their cards.
   Then AirROI `GET /listings/metrics/all` for each chosen comp: 12 months of monthly occupancy and revenue, used for
   peak (May-Oct) vs shoulder (Nov-Apr) occupancy and for the monthly revenue chart.
5. Scenarios (all annual):
   - Conservative: the lower of the comp 25th percentile and AirROI's location estimate (never above the base)
   - Base: average of the comp median and AirROI's location estimate
   - Optimistic: the highest of the comp 75th percentile, AirROI's p75 estimate and the base case
   - Occupancy is on open nights: AirROI `ttm_adjusted_occupancy` (nights booked / nights open to guests). Each scenario uses the matching comp percentile. ADR = revenue / (occupancy x median open nights of the comps), which recovers revenue per booked night.
   - Each comp also shows its average AirROI monthly occupancy over the subject's rate-card season.
   - With `criteria.anchor_rate_card: true` and a rate card, the tiers are instead year-round and anchored on the
     subject's own summer pricing: summer = (rate-card total / rate-card nights) x rate-card nights x the comps'
     AirROI occupancy in the rate-card months; off-season = the comps' actual AirROI revenue and booked nights in all
     other months. 25th percentile / median / 75th percentile of the comps for Conservative / Base / Optimistic.
     The comp-only tiers are kept as a cross-check.
   - `rank_by: "mix"` takes half the comps by highest nightly rate ("Premium rate") and half by highest 12-month
     revenue ("Top earner").
6. Compares the base case with the property's published rate card, if it has one.

## Data integrity

Only AirROI values reach the report. `airroi.FIELD_MAP` lists the key paths tried for each field.
If AirROI doesn't return a field, it renders blank and is listed under "Data notes". It is never estimated.
After a live run, check the raw JSON. If a blank field exists under another key, add that key
to `FIELD_MAP` and rebuild with `--from-raw`.

## Network needs

`api.airroi.com`, `geocoding.geo.census.gov`, and each photo host (for example `a0.muscache.com` for
Airbnb photos, `res.cloudinary.com` for the Timberlane hero image).
