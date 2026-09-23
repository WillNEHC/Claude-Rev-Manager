"""AirROI client + field extraction for the STR comping agent.

Only real AirROI values are ever surfaced. Every accessor returns None when the
field is not in the payload -- callers must render None as blank, never estimate.

Endpoints (https://www.airroi.com/api/documentation, auth header X-API-KEY):
  GET /calculator/estimate   lat, lng, bedrooms, baths, guests[, currency]
      -> revenue, occupancy, average_daily_rate, percentiles{...},
         monthly_revenue_distributions[12], comparable_listings[...]
  GET /listings/comparables  (lat+lng | address), bedrooms, baths, guests[, currency]
      -> listings[...]
  POST /listings/search/radius  latitude, longitude, radius_miles, filter, sort, pagination (10/page)
      -> results[...], pagination.total_count
  GET /listings/metrics/all  listing_id, num_months[, currency]
      -> results[{date, occupancy, average_daily_rate, rev_par, revenue}]

Listing records are nested: listing_info / property_details / location_info /
ratings / performance_metrics. FIELD_MAP lists the key paths tried for each
field, first hit wins. If a live run shows a field blank that AirROI does
return, add its path here (raw responses are saved next to the report).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests

BASE_URL = os.environ.get("AIRROI_BASE_URL", "https://api.airroi.com")

FIELD_MAP: dict[str, list[str]] = {
    "listing_id": ["listing_info.listing_id", "listing_id", "id"],
    "name": ["listing_info.listing_name", "listing_name", "name"],
    "photo": [
        "listing_info.cover_photo_url", "listing_info.photo_url", "listing_info.picture_url",
        "listing_info.photos.0", "property_details.photos.0", "cover_photo_url", "photos.0",
    ],
    "city": ["location_info.locality", "location_info.city", "listing_info.city", "city"],
    "lat": ["location_info.latitude", "latitude", "lat"],
    "lng": ["location_info.longitude", "longitude", "lng"],
    "bedrooms": ["property_details.bedrooms", "bedrooms"],
    "baths": ["property_details.baths", "property_details.bathrooms", "baths"],
    "guests": ["property_details.guests", "property_details.max_guests", "guests"],
    "amenities": ["property_details.amenities", "amenities"],
    "rating": ["ratings.rating_overall", "ratings.overall", "listing_info.rating", "rating"],
    "reviews": ["ratings.num_reviews", "ratings.review_count", "listing_info.num_reviews",
                "listing_info.reviews_count", "num_reviews"],
    "revenue": ["performance_metrics.ttm_revenue"],
    "revenue_potential": ["performance_metrics.ttm_revenue_potential",
                          "performance_metrics.ttm_potential_revenue"],
    "occupancy": ["performance_metrics.ttm_occupancy"],
    "adr": ["performance_metrics.ttm_avg_rate", "performance_metrics.ttm_adr"],
    # Days Available = ttm_total_days - ttm_blocked_days (nights open to guests, booked or not).
    # AirROI's ttm_available_days is only the open nights that went unbooked.
    "total_days": ["performance_metrics.ttm_total_days"],
    "blocked_days": ["performance_metrics.ttm_blocked_days"],
    "nights_booked": ["performance_metrics.ttm_days_reserved",
                      "performance_metrics.ttm_reserved_days", "performance_metrics.ttm_booked_days"],
}


class AirROIError(RuntimeError):
    pass


def _get_path(obj: Any, path: str) -> Any:
    cur = obj
    for part in path.split("."):
        if cur is None:
            return None
        if isinstance(cur, list):
            if not part.isdigit() or int(part) >= len(cur):
                return None
            cur = cur[int(part)]
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def field(listing: dict, name: str) -> Any:
    for path in FIELD_MAP[name]:
        val = _get_path(listing, path)
        if val not in (None, "", []):
            if name == "photo" and isinstance(val, dict):
                val = val.get("url") or val.get("large") or val.get("original")
            if name == "occupancy":
                val = normalize_occupancy(val)
            return val
    return None


def normalize_occupancy(val: Any) -> float | None:
    """AirROI occupancy is a 0-1 fraction; tolerate 0-100 percentages."""
    if val is None:
        return None
    v = float(val)
    return v / 100 if v > 1 else v


def flatten(listing: dict) -> dict:
    out = {name: field(listing, name) for name in FIELD_MAP}
    total, blocked = out["total_days"], out.pop("blocked_days")
    out["days_available"] = (float(total) - float(blocked)) if None not in (total, blocked) else None
    return out


class Client:
    def __init__(self, api_key: str | None = None, raw_dir: Path | None = None):
        self.api_key = api_key or os.environ.get("AIRROI_API_KEY")
        if not self.api_key:
            raise AirROIError("AIRROI_API_KEY is not set")
        self.raw_dir = raw_dir
        self.calls = 0

    def _get(self, path: str, params: dict, save_as: str, *, body: dict | None = None) -> dict:
        try:
            if body is None:
                resp = requests.get(f"{BASE_URL}{path}", params=params,
                                    headers={"X-API-KEY": self.api_key}, timeout=60)
            else:
                resp = requests.post(f"{BASE_URL}{path}", json=body,
                                     headers={"X-API-KEY": self.api_key}, timeout=60)
        except requests.RequestException as ex:
            raise AirROIError(f"{path} -> cannot reach AirROI ({ex.__class__.__name__})") from ex
        self.calls += 1
        if resp.status_code != 200:
            raise AirROIError(f"{path} -> HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        if self.raw_dir:
            self.raw_dir.mkdir(parents=True, exist_ok=True)
            request = {"path": path, "params": params} if body is None else {"path": path, "body": body}
            (self.raw_dir / f"{save_as}.json").write_text(json.dumps(
                {"request": request, "response": data}, indent=2))
        return data

    def search_radius(self, lat: float, lng: float, radius_miles: float, filt: dict, *,
                      sort: dict | None = None, max_pages: int = 5, tag: str = "") -> list[dict]:
        """POST /listings/search/radius, 10 per page (AirROI maximum), until exhausted or max_pages."""
        out: list[dict] = []
        for page in range(max_pages):
            body = {"latitude": lat, "longitude": lng, "radius_miles": radius_miles, "filter": filt,
                    "pagination": {"page_size": 10, "offset": page * 10}, "currency": "usd"}
            if sort:
                body["sort"] = sort
            data = self._get("/listings/search/radius", {}, f"search-radius{tag}-p{page + 1}", body=body)
            got = listings_of(data)
            out += got
            total = ((data.get("pagination") or {}).get("total_count")
                     if isinstance(data, dict) else None)
            if len(got) < 10 or (total is not None and len(out) >= total):
                break
        return out

    def monthly_metrics(self, listing_id: int, num_months: int = 12) -> list[dict]:
        """GET /listings/metrics/all: per-month occupancy, ADR and revenue for one listing."""
        data = self._get("/listings/metrics/all",
                         {"listing_id": listing_id, "num_months": num_months, "currency": "usd"},
                         f"metrics-{listing_id}")
        return listings_of(data)

    def estimate(self, lat: float, lng: float, bedrooms: int, baths: float, guests: int) -> dict:
        return self._get("/calculator/estimate",
                         {"lat": lat, "lng": lng, "bedrooms": bedrooms, "baths": baths,
                          "guests": guests, "currency": "usd"}, "estimate")

    def comparables(self, bedrooms: int, baths: float, guests: int, *, lat: float | None = None,
                    lng: float | None = None, address: str | None = None, tag: str = "") -> list[dict]:
        params: dict[str, Any] = {"bedrooms": bedrooms, "baths": baths, "guests": guests, "currency": "usd"}
        if lat is not None and lng is not None:
            params.update(latitude=lat, longitude=lng)
        elif address:
            params["address"] = address
        else:
            raise AirROIError("comparables needs lat/lng or address")
        data = self._get("/listings/comparables", params, f"comparables{tag}")
        return listings_of(data)


def listings_of(data: Any) -> list[dict]:
    if isinstance(data, list):
        return data
    for key in ("listings", "comparable_listings", "results", "data"):
        if isinstance(data, dict) and isinstance(data.get(key), list):
            return data[key]
    return []


def geocode_census(address: str) -> tuple[float, float] | None:
    """US Census geocoder (free, no key). Returns (lat, lng) or None."""
    try:
        r = requests.get("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
                         params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
                         timeout=30)
        matches = r.json()["result"]["addressMatches"]
        if matches:
            c = matches[0]["coordinates"]
            return float(c["y"]), float(c["x"])
    except Exception:
        pass
    return None
