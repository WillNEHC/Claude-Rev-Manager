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
3. AirROI `GET /listings/comparables` at the subject, then at each backup town, once per bedroom count in range.
4. Filters to the criteria (bedrooms, guests, has trailing-12-month revenue, minimum rating when
   enough comps qualify). Ranks by town priority, then lake or dock signal, rating and reviews. Keeps the top N.
5. Scenarios (all annual):
   - Conservative: 25th percentile of comp revenue
   - Base: average of the comp median and AirROI's location estimate
   - Optimistic: the highest of the comp 75th percentile, AirROI's p75 estimate and the base case
   - The occupancy shown for each scenario is the matching comp percentile. ADR = revenue / (occupancy x available nights), where available nights = AirROI `ttm_available_days` (open, unbooked) + `ttm_days_reserved` (booked).
6. Compares the base case with the property's published rate card, if it has one.

## Data integrity

Only AirROI values reach the report. `airroi.FIELD_MAP` lists the key paths tried for each field.
If AirROI doesn't return a field, it renders blank and is listed under "Data notes". It is never estimated.
After a live run, check the raw JSON. If a blank field exists under another key, add that key
to `FIELD_MAP` and rebuild with `--from-raw`.

## Network needs

`api.airroi.com`, `geocoding.geo.census.gov`, and each photo host (for example `a0.muscache.com` for
Airbnb photos, `res.cloudinary.com` for the Timberlane hero image).
