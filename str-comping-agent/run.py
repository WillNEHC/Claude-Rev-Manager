#!/usr/bin/env python3
"""STR comping agent: AirROI comp pull -> Short-Term Rental Income Analysis (HTML + PDF).

Usage:
  AIRROI_API_KEY=... python3 str-comping-agent/run.py subjects/81-timberlane-wolfeboro.json
  python3 str-comping-agent/run.py SUBJECT.json --from-raw output/data/<slug>   # rebuild, no API calls

Writes output/<output_name>.html, output/<output_name>.pdf and output/data/<slug>/*.json (raw AirROI).
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import airroi  # noqa: E402
import comping  # noqa: E402
import report  # noqa: E402

REPO = HERE.parent


def load_dotenv() -> None:
    """Load KEY=VALUE lines from .env.local / .env at the repo root (real env vars win)."""
    for name in (".env.local", ".env"):
        path = REPO / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            val = val.strip().strip('"').strip("'")
            if val and key.strip() not in os.environ:
                os.environ[key.strip()] = val


load_dotenv()
CARD_FIELDS = {"photo": "photo", "guests": "sleeps", "bedrooms": "bedrooms", "baths": "baths",
               "rating": "rating", "reviews": "review count", "amenities": "amenities",
               "revenue_potential": "Revenue Potential", "revenue": "Annual Revenue",
               "occupancy": "Occupancy", "adr": "ADR", "days_available": "Days Available",
               "nights_booked": "Nights Booked"}


def pull(subject: dict, raw_dir: Path) -> tuple[list[dict], dict | None, tuple, list[str]]:
    client = airroi.Client(raw_dir=raw_dir)
    notes = []
    lat, lng = subject.get("lat"), subject.get("lng")
    if lat is None or lng is None:
        geo = airroi.geocode_census(subject["address"])
        if geo:
            lat, lng = geo
            notes.append(f"Subject geocoded by US Census geocoder: {lat:.5f}, {lng:.5f}.")
    beds, baths, guests = subject["bedrooms"], subject["baths"], subject["guests"]

    estimate, candidates = None, []
    if lat is not None:
        try:
            estimate = client.estimate(lat, lng, beds, baths, guests)
            candidates += airroi.listings_of(estimate)
        except airroi.AirROIError as ex:
            notes.append(f"AirROI estimate failed: {ex}")
    for b in range(subject["criteria"]["bedrooms"][0], subject["criteria"]["bedrooms"][1] + 1):
        try:
            candidates += client.comparables(b, baths, guests, lat=lat, lng=lng,
                                             address=None if lat is not None else subject["address"],
                                             tag=f"-subject-{b}br")
        except airroi.AirROIError as ex:
            notes.append(f"AirROI comparables ({b} BR, subject location) failed: {ex}")
    for town in subject["criteria"]["towns"][1:]:
        for b in range(subject["criteria"]["bedrooms"][0], subject["criteria"]["bedrooms"][1] + 1):
            try:
                candidates += client.comparables(b, baths, guests, address=f"{town}, {subject['state']}",
                                                 tag=f"-{town.lower()}-{b}br")
            except airroi.AirROIError as ex:
                notes.append(f"AirROI comparables ({town}, {b} BR) failed: {ex}")
    notes.append(f"AirROI API calls made: {client.calls}.")
    return candidates, estimate, (lat, lng), notes


def load_raw(raw_dir: Path) -> tuple[list[dict], dict | None]:
    estimate, candidates = None, []
    for f in sorted(raw_dir.glob("*.json")):
        data = json.loads(f.read_text()).get("response")
        if f.stem == "estimate":
            estimate = data
        candidates += airroi.listings_of(data)
    return candidates, estimate


def find_chrome() -> str | None:
    if os.environ.get("CHROME_PATH"):
        return os.environ["CHROME_PATH"]
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        if shutil.which(name):
            return shutil.which(name)
    for pattern in ("/opt/pw-browsers/chromium-*/chrome-linux/chrome",
                    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                    "/Applications/Chromium.app/Contents/MacOS/Chromium",
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    return None


def to_pdf(html_path: Path, pdf_path: Path) -> str | None:
    chrome = find_chrome()
    if not chrome:
        return "No Chrome/Chromium found; set CHROME_PATH to make the PDF."
    cmd = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
           f"--print-to-pdf={pdf_path}", html_path.resolve().as_uri()]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if not pdf_path.exists():
        return f"PDF export failed: {res.stderr[-400:]}"
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("subject")
    ap.add_argument("--from-raw", help="rebuild from saved AirROI responses in this dir (no API calls)")
    ap.add_argument("--out-dir", default=str(REPO / "output"))
    args = ap.parse_args()

    subject = json.loads(Path(args.subject).read_text())
    out_dir = Path(args.out_dir)
    raw_dir = Path(args.from_raw) if args.from_raw else out_dir / "data" / subject["slug"]

    if args.from_raw:
        candidates, estimate = load_raw(raw_dir)
        lat, lng = subject.get("lat"), subject.get("lng")
        notes = [f"Rebuilt from saved AirROI responses in {raw_dir}."]
    else:
        candidates, estimate, (lat, lng), notes = pull(subject, raw_dir)

    flat = [airroi.flatten(c) for c in candidates]
    comps, sel_notes = comping.select_comps(flat, subject["criteria"], lat, lng)
    notes += sel_notes
    if not comps:
        print("No comps with AirROI revenue matched the criteria. Nothing rendered.\n  "
              + "\n  ".join(notes), file=sys.stderr)
        return 2

    sc = comping.scenarios(comps, estimate)
    months = comping.monthly_split(estimate, sc["base"]["revenue"])
    rc = comping.rate_card_comparison(subject["rate_card"], sc["base"]["revenue"], months, sc)

    blanks = []
    subject["_photo"], err = report.embed_photo(subject.get("photo_url"))
    if err:
        blanks.append(f"Subject photo: {err}.")
    for c in comps:
        c["_photo"], err = report.embed_photo(c.get("photo"))
        if err and c.get("photo"):
            blanks.append(f"{c.get('name')}: photo {err}.")
        missing = [label for key, label in CARD_FIELDS.items() if c.get(key) in (None, "", [])]
        if missing:
            blanks.append(f"{c.get('name')}: AirROI did not return {', '.join(missing)} (left blank).")

    html = report.render(subject, comps, sc, months, rc, notes, blanks)
    out_dir.mkdir(parents=True, exist_ok=True)
    html_path = out_dir / f"{subject['output_name']}.html"
    html_path.write_text(html)
    pdf_err = to_pdf(html_path, out_dir / f"{subject['output_name']}.pdf")

    summary = {
        "html": str(html_path), "pdf": None if pdf_err else str(out_dir / f"{subject['output_name']}.pdf"),
        "conservative": sc["conservative"], "base": sc["base"], "optimistic": sc["optimistic"],
        "comp_median_revenue": sc["comp_median_revenue"], "market_model_revenue": sc["market_model_revenue"],
        "rate_card_total": rc["total"],
        "comps": [{"name": c.get("name"), "city": c.get("city"), "listing_id": c.get("listing_id"),
                   "annual_revenue": c.get("revenue")} for c in comps],
        "notes": notes + blanks + ([pdf_err] if pdf_err else []),
    }
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    print(json.dumps(summary, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
