"""Comp selection and revenue scenarios. Pure functions -- no network, no estimation.

Every number produced here is either a real AirROI value or plain arithmetic on
real AirROI values (percentiles, medians, averages). The arithmetic is spelled
out in the report's methodology section.
"""
from __future__ import annotations

import math
from statistics import median

LAKE_KEYWORDS = ("lake", "waterfront", "water front", "beachfront", "beach access", "boat slip",
                 "dock", "private beach", "kayak")


WATER_AMENITIES = ("waterfront", "lake access", "boat slip")


def has_water_amenity(comp: dict) -> bool:
    """AirROI amenity list includes waterfront, lake access or boat slip."""
    return any(str(a).lower().replace("_", " ") in WATER_AMENITIES for a in (comp.get("amenities") or []))


def is_lake(comp: dict) -> bool:
    text = " ".join([str(comp.get("name") or "")] + [str(a) for a in (comp.get("amenities") or [])]).lower()
    return any(k in text for k in LAKE_KEYWORDS)


def haversine_mi(lat1, lng1, lat2, lng2) -> float | None:
    if None in (lat1, lng1, lat2, lng2):
        return None
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def select_comps(candidates: list[dict], criteria: dict, subject_lat=None, subject_lng=None,
                 subject_bedrooms=None) -> tuple[list[dict], list[str]]:
    """Filter + rank candidates. Returns (chosen, notes).

    Hard filters: has AirROI ttm revenue; bedrooms and guests inside the criteria
    range when AirROI returns them; optional water amenity, minimum reviews and
    minimum booked nights. Ranking (criteria["rank_by"]):
      "town" (default): town priority, lake/dock signal, rating, review count
      "adr": AirROI trailing-12-month average nightly rate, highest first (premium tier)
      "revenue": AirROI trailing-12-month revenue, highest first (top performers)
    Comps with more bedrooms than the subject are flagged c["_larger"] for labeling.
    """
    notes: list[str] = []
    bmin, bmax = criteria["bedrooms"]
    gmin, gmax = criteria["guests"]
    towns = [t.lower() for t in criteria.get("towns", [])]
    seen: set = set()
    pool = []
    for c in candidates:
        key = c.get("listing_id") or (c.get("name"), c.get("lat"), c.get("lng"))
        if key in seen:
            continue
        seen.add(key)
        if c.get("revenue") in (None, 0):
            continue
        if c.get("bedrooms") is not None and not (bmin <= float(c["bedrooms"]) <= bmax):
            continue
        if c.get("guests") is not None and not (gmin <= float(c["guests"]) <= gmax):
            continue
        if criteria.get("require_water") and not has_water_amenity(c):
            continue
        if criteria.get("min_reviews") and (c.get("reviews") or 0) < criteria["min_reviews"]:
            continue
        if criteria.get("min_nights_booked") and (c.get("nights_booked") or 0) < criteria["min_nights_booked"]:
            continue
        c["_larger"] = (subject_bedrooms is not None and c.get("bedrooms") is not None
                        and float(c["bedrooms"]) > float(subject_bedrooms))
        city = (c.get("city") or "").lower()
        c["_town_rank"] = next((i for i, t in enumerate(towns) if t[:8] in city), len(towns))  # "Moultonboro" == "Moultonborough"
        c["_distance_mi"] = haversine_mi(subject_lat, subject_lng, c.get("lat"), c.get("lng"))
        c["_lake"] = is_lake(c)
        pool.append(c)

    min_rating = criteria.get("min_rating")
    if min_rating:
        strong = [c for c in pool if c.get("rating") is None or float(c["rating"]) >= min_rating]
        if len(strong) >= criteria["count"]:
            pool = strong
        else:
            notes.append(f"Fewer than {criteria['count']} candidates rated {min_rating}+; rating filter relaxed.")

    def sort_key(c):
        if criteria.get("rank_by") == "revenue":
            return (-(float(c["revenue"]) if c.get("revenue") is not None else 0),
                    -(float(c["rating"]) if c.get("rating") is not None else 0))
        if criteria.get("rank_by") == "adr":
            return (-(float(c["adr"]) if c.get("adr") is not None else 0),
                    -(float(c["rating"]) if c.get("rating") is not None else 0))
        return (c["_town_rank"], 0 if c["_lake"] else 1,
                -(float(c["rating"]) if c.get("rating") is not None else 0),
                -(int(c["reviews"]) if c.get("reviews") is not None else 0),
                c["_distance_mi"] if c["_distance_mi"] is not None else 999)

    if criteria.get("rank_by") == "mix":
        # Half the set: highest AirROI nightly rate. Other half: highest AirROI 12-month revenue.
        n_rate = criteria["count"] // 2
        by_rate = sorted(pool, key=lambda c: (-(float(c["adr"]) if c.get("adr") else 0),
                                              -(float(c["rating"]) if c.get("rating") else 0)))
        chosen = by_rate[:n_rate]
        for c in chosen:
            c["_tier"] = "Premium rate"
        ids = {id(c) for c in chosen}
        by_rev = sorted((c for c in pool if id(c) not in ids),
                        key=lambda c: -(float(c["revenue"]) if c.get("revenue") else 0))
        for c in by_rev[: criteria["count"] - n_rate]:
            c["_tier"] = "Top earner"
            chosen.append(c)
    else:
        pool.sort(key=sort_key)
        chosen = pool[: criteria["count"]]
    primary = [c for c in chosen if c["_town_rank"] == 0]
    if towns and criteria.get("rank_by", "town") == "town" and len(primary) < criteria["count"]:
        notes.append(f"{criteria['towns'][0]} returned {len(primary)} qualifying comp(s); "
                     f"filled from nearby towns ({', '.join(criteria['towns'][1:])}).")
    if len(chosen) < criteria["count"]:
        notes.append(f"Only {len(chosen)} comps met the criteria (asked for {criteria['count']}).")
    return chosen, notes


def pct(values: list[float], p: float) -> float | None:
    """Linear-interpolated percentile (same method as Excel PERCENTILE.INC)."""
    vals = sorted(v for v in values if v is not None)
    if not vals:
        return None
    k = (len(vals) - 1) * p
    lo, hi = math.floor(k), math.ceil(k)
    return vals[lo] + (vals[hi] - vals[lo]) * (k - lo)


def scenarios(comps: list[dict], estimate: dict | None) -> dict:
    revs = [float(c["revenue"]) for c in comps if c.get("revenue") is not None]
    # Open-night basis: AirROI ttm_adjusted_occupancy = nights booked / nights open to guests
    # (total days minus blocked days), and days_available = those open nights. So
    # revenue / (occupancy x open nights) recovers revenue per booked night.
    occs = [float(c["adjusted_occupancy"]) for c in comps if c.get("adjusted_occupancy") is not None]
    days = [float(c["days_available"]) for c in comps if c.get("days_available") is not None]
    adrs = [float(c["adr"]) for c in comps if c.get("adr") is not None]

    comp_median = median(revs) if revs else None
    market = float(estimate["revenue"]) if estimate and estimate.get("revenue") else None
    market_p75 = None
    if estimate:
        market_p75 = (((estimate.get("percentiles") or {}).get("revenue") or {}).get("p75"))
        market_p75 = float(market_p75) if market_p75 else None

    base = (comp_median + market) / 2 if (comp_median and market) else (comp_median or market)
    # Conservative never sits above the base: the lower of the comp 25th percentile and
    # AirROI's location estimate for a typical home.
    conservative = min(x for x in (pct(revs, 0.25), market) if x is not None) if (revs or market) else None
    optimistic = max(x for x in (pct(revs, 0.75), market_p75, base) if x is not None) if base else None
    days_used = round(median(days)) if days else 365

    def tier(rev, occ):
        if rev is None:
            return None
        adr = rev / (occ * days_used) if occ else None
        return {"revenue": rev, "occupancy": occ, "adr": adr}

    agreement = None
    if comp_median and market:
        agreement = abs(comp_median - market) / max(comp_median, market)

    cons_tier = tier(conservative, pct(occs, 0.25))
    if conservative is not None and market is not None and conservative == market and estimate:
        # Conservative is AirROI's typical-home estimate: show that estimate's own occupancy and ADR.
        occ_e, adr_e = estimate.get("occupancy"), estimate.get("average_daily_rate")
        if occ_e is not None and adr_e is not None:
            cons_tier = {"revenue": market, "occupancy": float(occ_e), "adr": float(adr_e), "source": "estimate"}

    return {
        "conservative": cons_tier,
        "base": tier(base, median(occs) if occs else None),
        "optimistic": tier(optimistic, pct(occs, 0.75)),
        "comp_median_revenue": comp_median,
        "market_model_revenue": market,
        "market_model_p75": market_p75,
        "methods_gap": agreement,
        "days_used": days_used,
        "days_from_comps": bool(days),
        "occ_range": (min(occs), max(occs)) if occs else None,
        "adr_range": (min(adrs), max(adrs)) if adrs else None,
    }


def rate_occupancy_tradeoff(pool: list[dict], estimate: dict | None, beds, min_booked: int = 0) -> dict | None:
    """Plain facts from the whole candidate pool: who reaches 40%+ occupancy, at what nightly rates."""
    act = [c for c in pool if c.get("adjusted_occupancy") is not None and c.get("adr")
           and (c.get("nights_booked") or 0) >= min_booked and (c.get("revenue") or 0) > 0]
    hi = [c for c in act if float(c["adjusted_occupancy"]) >= 0.40]
    if not act:
        return None
    return {"pool": len(act), "n_hi_occ": len(hi),
            "n_hi_occ_1000": sum(1 for c in hi if float(c["adr"]) >= 1000), "beds": beds,
            "est_occ": (estimate or {}).get("occupancy"), "est_adr": (estimate or {}).get("average_daily_rate")}


def anchored_scenarios(metrics_by_comp: dict, rate_card: dict) -> dict | None:
    """Year-round projection anchored on the subject's own published summer rate.

    Summer (rate-card season): published nightly equivalent (rate-card total / nights) x the comps'
    AirROI occupancy over those months, applied to the rate-card nights.
    Off-season (all other months): the comps' actual AirROI revenue and booked nights in those months.
    Each tier uses the matching comp percentile (25th / median / 75th) of each component.
    """
    import calendar
    months = set(rate_card.get("season_months") or [])
    weeks = sum(p["weeks"] for p in rate_card["periods"])
    total = sum(p["weeks"] * p["weekly_rate"] for p in rate_card["periods"])
    nights = weeks * 7
    rate = total / nights
    s_occ, off_rev, off_nights = [], [], []
    for rows in metrics_by_comp.values():
        if not rows:
            continue
        so = season_occupancy(rows, months)
        if so is None:
            continue
        rev = nts = 0.0
        for r in rows:
            d = str(r.get("date") or "")
            if len(d) < 7 or int(d[5:7]) in months:
                continue
            occ = float(r.get("occupancy") or 0)
            occ = occ / 100 if occ > 1 else occ
            rev += float(r.get("revenue") or 0)
            nts += occ * calendar.monthrange(int(d[:4]), int(d[5:7]))[1]
        s_occ.append(so)
        off_rev.append(rev)
        off_nights.append(nts)
    if not s_occ:
        return None
    out = {"rate": rate, "season_nights": nights, "comps_used": len(s_occ)}
    for name, p in (("conservative", 0.25), ("base", 0.5), ("optimistic", 0.75)):
        so, orv, onts = pct(s_occ, p), pct(off_rev, p), pct(off_nights, p)
        s_rev = rate * nights * so
        booked = nights * so + onts
        rev = s_rev + orv
        out[name] = {"revenue": rev, "occupancy": booked / 365, "adr": rev / booked if booked else None,
                     "season_occ": so, "season_revenue": s_rev, "off_revenue": orv, "booked": booked}
    return out


PEAK_MONTHS = (5, 6, 7, 8, 9, 10)  # May-Oct, as in the reference reports; Nov-Apr is shoulder


def season_occupancy(rows: list[dict] | None, months) -> float | None:
    """Average of AirROI monthly occupancy over the given calendar months (1-12)."""
    vals = []
    for r in rows or []:
        date, occ = str(r.get("date") or ""), r.get("occupancy")
        if occ is not None and len(date) >= 7 and int(date[5:7]) in months:
            vals.append(float(occ) / 100 if float(occ) > 1 else float(occ))
    return sum(vals) / len(vals) if vals else None


def seasonal_occupancy(metrics_by_comp: dict, season_months=None) -> dict | None:
    """Average monthly occupancy across the comp set, peak (May-Oct) vs shoulder (Nov-Apr).

    metrics_by_comp: {listing_id: [ {date: 'YYYY-MM', occupancy: 0-1, ...}, ... ]} from
    AirROI /listings/metrics/all. Plain averages of AirROI's monthly values.
    """
    peak, shoulder, used = [], [], 0
    month_rev = [0.0] * 12
    for rows in metrics_by_comp.values():
        got = False
        for r in rows or []:
            occ, date = r.get("occupancy"), str(r.get("date") or "")
            if occ is None or len(date) < 7:
                continue
            occ = float(occ) / 100 if float(occ) > 1 else float(occ)
            (peak if int(date[5:7]) in PEAK_MONTHS else shoulder).append(occ)
            if r.get("revenue") is not None:
                month_rev[int(date[5:7]) - 1] += float(r["revenue"])
            got = True
        used += got
    if not peak and not shoulder:
        return None
    season = None
    if season_months:
        per = [season_occupancy(rows, season_months) for rows in metrics_by_comp.values()]
        per = [v for v in per if v is not None]
        season = sum(per) / len(per) if per else None
    return {"season": season, "season_months": list(season_months or []),
            "peak": sum(peak) / len(peak) if peak else None,
            "shoulder": sum(shoulder) / len(shoulder) if shoulder else None,
            "comps_used": used,
            # combined AirROI monthly revenue of the comp set, Jan..Dec
            "monthly_revenue": month_rev if sum(month_rev) > 0 else None}


def monthly_split(estimate: dict | None, annual: float | None,
                  comp_monthly: list[float] | None = None) -> list[float] | None:
    """Scale a 12-month revenue pattern to the base-case annual total.

    Uses the comp set's own AirROI monthly revenue when available, else AirROI's
    location-level monthly_revenue_distributions from the estimate.
    """
    if not annual:
        return None
    if comp_monthly and len(comp_monthly) == 12 and sum(comp_monthly) > 0:
        total = sum(comp_monthly)
        return [annual * v / total for v in comp_monthly]
    if not estimate:
        return None
    dist = estimate.get("monthly_revenue_distributions")
    if not isinstance(dist, list) or len(dist) != 12:
        return None
    vals = [float(v.get("revenue", 0) if isinstance(v, dict) else v or 0) for v in dist]
    total = sum(vals)
    if total <= 0:
        return None
    return [annual * v / total for v in vals]


def rate_card_comparison(rate_card: dict, base: float | None, months: list[float] | None, sc: dict) -> dict:
    """Numbers for the rate-card vs comp-projection box. Plain arithmetic only."""
    weeks = sum(p["weeks"] for p in rate_card["periods"])
    total = sum(p["weeks"] * p["weekly_rate"] for p in rate_card["periods"])
    nights = weeks * 7
    out = {
        "weeks": weeks, "total": total, "nights": nights,
        "implied_nightly": total / nights,
        "gap": (total - base) if base else None,
        "summer_share": None, "comp_summer_revenue": None,
    }
    if months:
        idx = [m - 1 for m in rate_card["season_months"]]
        summer = sum(months[i] for i in idx)
        out["comp_summer_revenue"] = summer
        out["summer_share"] = summer / sum(months)
    base_adr = (sc.get("base") or {}).get("adr")
    out["base_adr"] = base_adr
    out["adr_multiple"] = (out["implied_nightly"] / base_adr) if base_adr else None
    return out
