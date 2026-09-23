"""Render the Short-Term Rental Income Analysis report as a self-contained HTML file.

Self-contained means: no external scripts, fonts, stylesheets or image links.
Photos are embedded as base64 data URIs and the monthly chart is inline SVG,
so the file renders the same in a browser, an email client or a PDF export.

Palette is fixed: navy #122F49, sage #7E9A80, cream #F4F0E6, white. Solid fills only.
"""
from __future__ import annotations

import base64
import datetime as dt
from html import escape

import requests

NAVY, SAGE, CREAM, WHITE = "#122F49", "#7E9A80", "#F4F0E6", "#FFFFFF"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------- formatting (None always renders blank) ----------

def money(v, dec=0):
    return "" if v is None else f"${v:,.{dec}f}"


def money_k(v):
    if v is None:
        return ""
    return f"${v / 1000:,.1f}K" if abs(v) >= 1000 else f"${v:,.0f}"


def pct(v, dec=0):
    return "" if v is None else f"{v * 100:.{dec}f}%"


def num(v):
    if v is None:
        return ""
    f = float(v)
    return f"{f:g}" if f != int(f) else f"{int(f)}"


def e(v):
    return escape("" if v is None else str(v))


def pretty_amenity(a) -> str:
    s = str(a).replace("_", " ").strip()
    return s[:1].upper() + s[1:]


# ---------- photos ----------

def embed_photo(url: str | None) -> tuple[str | None, str | None]:
    """Download an image and return (data_uri, error)."""
    if not url:
        return None, "no photo URL returned"
    try:
        r = requests.get(url, timeout=45, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        if not ctype.startswith("image/"):
            return None, f"not an image ({ctype})"
        return f"data:{ctype};base64,{base64.b64encode(r.content).decode()}", None
    except Exception as ex:  # noqa: BLE001 - report the failure, keep building
        return None, f"download failed: {ex.__class__.__name__}"


def photo_block(data_uri, alt, cls):
    if data_uri:
        return f'<img class="{cls}" src="{data_uri}" alt="{e(alt)}">'
    return f'<div class="{cls} photo-missing">Photo not available</div>'


# ---------- chart ----------

def monthly_svg(values: list[float] | None, highlight: set[int]) -> str:
    if not values:
        return '<p class="muted">AirROI did not return a monthly revenue distribution for this location.</p>'
    w, h, pad_l, pad_b, pad_t = 900, 320, 20, 36, 30
    bw = (w - pad_l * 2) / 12
    top = max(values) or 1
    bars = []
    for i, v in enumerate(values):
        bh = (h - pad_b - pad_t) * v / top
        x = pad_l + i * bw + bw * 0.14
        y = h - pad_b - bh
        fill = NAVY if (i + 1) in highlight else SAGE
        bars.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw * 0.72:.1f}" height="{bh:.1f}" rx="4" fill="{fill}"/>'
            f'<text x="{x + bw * 0.36:.1f}" y="{y - 8:.1f}" text-anchor="middle" class="svg-val">{money_k(v)}</text>'
            f'<text x="{x + bw * 0.36:.1f}" y="{h - 12}" text-anchor="middle" class="svg-lbl">{MONTHS[i]}</text>')
    return (f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Projected monthly revenue" class="chart">'
            f'<line x1="{pad_l}" y1="{h - pad_b}" x2="{w - pad_l}" y2="{h - pad_b}" stroke="{SAGE}" stroke-width="1"/>'
            + "".join(bars) + "</svg>")


# ---------- sections ----------

def season_label(months) -> str:
    return f"{MONTHS[months[0] - 1]}&ndash;{MONTHS[months[-1] - 1]}" if months else ""


def comp_card(c: dict, subject_bedrooms=None, season_months=None) -> str:
    specs = " / ".join(x for x in [
        f"Sleeps {num(c['guests'])}" if c.get("guests") is not None else "",
        f"{num(c['bedrooms'])} BR" if c.get("bedrooms") is not None else "",
        f"{num(c['baths'])} BA" if c.get("baths") is not None else "",
    ] if x)
    rating = ""
    if c.get("rating") is not None:
        rating = f"{float(c['rating']):.2f}"
        if c.get("reviews") is not None:
            rating += f" ({int(c['reviews'])} reviews)"
    amen = c.get("amenities") or []
    amen = sorted(amen, key=lambda a: 0 if any(k in str(a).lower() for k in
                  ("lake", "water", "beach", "dock", "boat", "kayak", "fire", "hot tub", "game")) else 1)[:6]
    badges = "".join(f'<span class="badge">{e(pretty_amenity(a))}</span>' for a in amen)
    metrics = [("Revenue Potential", money_k(c.get("revenue_potential"))),
               ("Annual Revenue", money_k(c.get("revenue"))),
               ("Occupancy (open nights)", pct(c.get("adjusted_occupancy"))),
               (f"Summer occupancy ({season_label(season_months)})", pct(c.get("_season_occ"))),
               ("ADR", money(c.get("adr"))),
               ("Days Available", num(c.get("days_available"))),
               ("Nights Booked", num(c.get("nights_booked")))]
    grid = "".join(f'<div class="metric"><div class="k">{k}</div><div class="v">{v}</div></div>' for k, v in metrics)
    link = (f'<a class="card-link" href="https://www.airbnb.com/rooms/{e(c["listing_id"])}">View listing</a>'
            if c.get("listing_id") else "")
    town = e(c.get("city") or "")
    dist = f" &middot; {c['_distance_mi']:.1f} mi from subject" if c.get("_distance_mi") is not None else ""
    larger = (f'<div class="flag">Larger home: {num(c["bedrooms"])} BR vs subject {num(subject_bedrooms)} BR</div>'
              if c.get("_larger") else "")
    if c.get("_tier"):
        larger = f'<div class="flag" style="background:var(--sage)">{e(c["_tier"])}</div> ' + larger
    return f"""
      <article class="comp avoid-break">
        {photo_block(c.get('_photo'), c.get('name'), 'comp-img')}
        <div class="comp-body">
          {larger}
          <h4>{e(c.get('name'))}</h4>
          <div class="muted small">{town}{dist}</div>
          <div class="specs">{e(specs)}{' &middot; Rating ' + e(rating) if rating else ''}</div>
          <div class="badges">{badges}</div>
          <div class="metric-grid">{grid}</div>
        </div>
        {link}
      </article>"""


def seasonal_block(seasonal: dict | None) -> str:
    if not seasonal or (seasonal.get("peak") is None and seasonal.get("shoulder") is None):
        return ""
    summer_line = ""
    if seasonal.get("season") is not None:
        months = seasonal.get("season_months") or []
        summer_line = (f'<div class="info" style="margin-bottom:18px"><b class="t">Summer rate-card season '
                       f'({season_label(months)})</b>The comps averaged <strong>{pct(seasonal["season"])} occupancy</strong> '
                       f'in these months, the same months the subject is rented today.</div>')
    sh = seasonal.get("shoulder")
    shoulder_line = ("Most of these homes took few or no Airbnb bookings in these months, so revenue is concentrated "
                     "in summer." if sh is not None and sh < 0.05 else
                     "Pricing and listing optimization have the most room to add revenue here.")
    return f"""
<section class="avoid-break">
  <div class="eyebrow">Performance Analytics</div>
  <h2>Seasonal Performance Patterns</h2>
  {summer_line}
  <div class="grid2">
    <div class="info"><b class="t">Peak season (May&ndash;Oct)</b>
      These months average <strong>{pct(seasonal.get('peak'))} occupancy</strong> across the comp set. This is the strongest demand window and carries the highest nightly rates of the year.</div>
    <div class="info"><b class="t">Shoulder season (Nov&ndash;Apr)</b>
      These months average <strong>{pct(seasonal.get('shoulder'))} occupancy</strong> across the comp set. {shoulder_line}</div>
  </div>
  <p class="muted small" style="margin-top:10px">Average of AirROI's monthly occupancy for {seasonal.get('comps_used')} comparable listings over the last 12 months.</p>
</section>"""


def occupancy_note(comps: list[dict], sc: dict, market_occ: dict | None, seasonal: dict | None = None,
                   season_months=None) -> str:
    """Explain the open-night occupancy basis and the summer numbers, from AirROI values only."""
    adj = [c["adjusted_occupancy"] for c in comps if c.get("adjusted_occupancy") is not None]
    parts = ["<strong>How occupancy is measured:</strong> the annual occupancy figures in this report are on open "
             "nights: nights booked divided by the nights the home was open to guests (AirROI excludes nights the "
             "owner blocked). Monthly and seasonal figures are AirROI's monthly occupancy."]
    if adj:
        parts.append(f" On that basis the comps booked {pct(min(adj))} to {pct(max(adj))} of their open nights "
                     f"over the last 12 months.")
    if seasonal and seasonal.get("season") is not None:
        parts.append(f" In the summer rate-card season ({season_label(season_months)}) they averaged "
                     f"<strong>{pct(seasonal['season'])}</strong>")
        sh = seasonal.get("shoulder")
        if sh is not None:
            parts.append(f" and from November to April {pct(sh)}"
                         + (", so most of their bookings fall in summer." if sh < 0.15 else "."))
        else:
            parts.append(".")
    if market_occ:
        parts.append(
            f" In AirROI's data for this area, higher nightly rates come with lower occupancy: "
            f"{market_occ['n_hi_occ']} of the {market_occ['pool']} active lake homes in the search booked 40% or more "
            f"of their open nights, and {market_occ['n_hi_occ_1000']} of those averaged $1,000+ a night. "
            f"AirROI's location estimate for a typical {market_occ['beds']}-bedroom home here is "
            f"{pct(market_occ['est_occ'])} occupancy at {money(market_occ['est_adr'])} a night.")
    return f'<div class="derive" style="margin-top:16px">{"".join(parts)}</div>'


def larger_note(comps: list[dict], subject: dict) -> str:
    big = [c for c in comps if c.get("_larger")]
    if not big:
        return ""
    return (f'<p class="small" style="margin:-8px 0 16px"><strong>Larger homes included:</strong> {len(big)} of '
            f'{len(comps)} comps have more bedrooms than {e(subject["name"])} ({subject["bedrooms"]} BR). '
            f'They are labeled on their cards. Larger homes can command higher nightly rates, so read them as the '
            f'top of the range rather than a like-for-like match.</p>')


def selection_lines(crit: dict) -> str:
    lines = []
    rs = crit.get("radius_search")
    if rs:
        lines.append(f"AirROI radius search within {rs['radius_miles']:g} miles of the subject, entire homes only")
    elif crit.get("towns"):
        lines.append(f"Searched {', '.join(crit['towns'])}, in that order of priority")
    if crit.get("require_water"):
        lines.append("Must list waterfront, lake access or a boat slip in AirROI's amenity data")
    lines.append("Must have AirROI trailing-12-month revenue")
    if crit.get("min_reviews"):
        lines.append(f"At least {crit['min_reviews']} reviews, rated {crit.get('min_rating', '')}+")
    if crit.get("min_nights_booked"):
        lines.append(f"At least {crit['min_nights_booked']} nights booked in the last 12 months (an established, active listing)")
    if crit.get("rank_by") == "mix":
        lines.append("Mixed set: half are the highest nightly rates in the search (labeled Premium rate), half are the "
                     "highest 12-month revenue (labeled Top earner)")
    elif crit.get("rank_by") == "revenue":
        lines.append("Ranked by AirROI trailing-12-month revenue, highest first: these are the top-performing lake "
                     "homes in the search, not the average home")
    elif crit.get("rank_by") == "adr":
        lines.append("Ranked by AirROI trailing-12-month average nightly rate, highest first, to represent the premium tier")
    else:
        lines.append("Lakefront or lake access with dock ranked first; then rating and review count")
    return "".join(f"<li>{e(x)}</li>" for x in lines)


def endpoints_used(crit: dict) -> str:
    if crit.get("radius_search"):
        return "/listings/search/radius, /listings/metrics/all and /calculator/estimate"
    return "/listings/comparables and /calculator/estimate"


def anchored_footnote(sc: dict, subject: dict) -> str:
    a = sc["anchored"]
    return (f'<p class="muted small" style="text-align:center">Annual gross revenue, year-round. Summer is priced at '
            f'{e(subject["name"])}&#39;s own published rate ({money(a["rate"])}/night across {a["season_nights"]} '
            f'rate-card nights); occupancy and off-season results come from {a["comps_used"]} comparable listings&#39; '
            f'trailing-12-month AirROI data.</p>')


def anchored_text(sc: dict, rc: dict, subject: dict, n: int) -> str:
    a, b = sc["anchored"], sc["base"]
    months = subject["rate_card"].get("season_months") or []
    cb = sc.get("comp_based", {}).get("base") or {}
    txt = (f"This projection uses {e(subject['name'])}&#39;s own summer pricing and the comps&#39; real booking "
           f"patterns. <strong>Summer ({season_label(months)}):</strong> the published rate card totals "
           f"{money(rc['total'])} for {rc['weeks']} weeks, or {money(a['rate'])} a night. The comps booked a median "
           f"{pct(b['season_occ'])} of nights in those months (AirROI monthly data), so {a['season_nights']} nights "
           f"&times; {pct(b['season_occ'])} &times; {money(a['rate'])} = <strong>{money(b['season_revenue'])}</strong>. "
           f"<strong>Rest of the year:</strong> the comps&#39; median actual AirROI revenue outside those months is "
           f"<strong>{money(b['off_revenue'])}</strong>. <strong>Base case:</strong> {money(b['revenue'])}, about "
           f"{round(b['booked'])} booked nights ({pct(b['occupancy'], 1)} of the year) at a blended {money(b['adr'])} ADR. "
           f"Conservative and Optimistic use the comps&#39; 25th and 75th percentiles for both parts.")
    if cb.get("revenue") is not None:
        txt += (f"<br><br><strong>Cross-check:</strong> the comps&#39; own trailing-12-month results (median revenue "
                f"{money(sc['comp_median_revenue'])}; AirROI&#39;s typical-home estimate {money(sc['market_model_revenue'])}) "
                f"give a comp-only base of {money(cb['revenue'])}. The difference is the summer rate: the comps average "
                f"well below {money(a['rate'])} a night on Airbnb.")
    gap = rc["total"] - b["revenue"]
    txt += (f"<br><br><strong>Compared with the current summer rate card:</strong> {money(rc['total'])} if all "
            f"{rc['weeks']} weeks sell. The base case assumes {pct(b['season_occ'])} of summer nights book at that rate, "
            f"plus off-season income the property does not earn today. The base case is "
            f"{money(abs(gap))} {'below' if gap > 0 else 'above'} the full rate card.")
    return txt


def scenario_lines(sc: dict, days) -> str:
    if sc.get("anchored"):
        return ("<li><b>Summer (rate-card months):</b> published rate &divide; rate-card nights = nightly rate; "
                "&times; rate-card nights &times; the comps&#39; AirROI occupancy in those months</li>"
                "<li><b>Off-season:</b> the comps&#39; actual AirROI revenue and booked nights in all other months</li>"
                "<li><b>Conservative / Base / Optimistic:</b> 25th percentile / median / 75th percentile of the comps "
                "for both parts; total = summer + off-season</li>"
                "<li>Occupancy = booked nights &divide; 365; ADR = revenue &divide; booked nights</li>")
    return ("<li><b>Conservative:</b> the lower of the comp 25th percentile and AirROI's location estimate for a "
            "typical home (when it is the estimate, it is shown with the estimate's own occupancy and ADR)</li>"
            "<li><b>Base:</b> average of the comp median and AirROI's location estimate</li>"
            "<li><b>Optimistic:</b> the highest of the comp 75th percentile, AirROI's 75th-percentile estimate and "
            "the base case</li>"
            "<li>Occupancy is on open nights: AirROI nights booked &divide; nights open to guests (total days minus "
            "blocked days). Each scenario uses the matching comp percentile</li>"
            f"<li>ADR = revenue &divide; (occupancy &times; {days} open nights, the comp median)</li>")


def derivation_text(sc: dict, rc: dict, subject: dict, n: int, comp_pattern: bool = False) -> str:
    parts = []
    cm, mm, base = sc["comp_median_revenue"], sc["market_model_revenue"], sc["base"]["revenue"]
    if cm and mm:
        parts.append(
            f"We combine two independent AirROI methods: the median trailing-12-month revenue of the {n} "
            f"comparable listings ({money(cm)}) and AirROI's revenue estimate for a {subject['bedrooms']}-bedroom, "
            f"{num(subject['baths'])}-bath, {subject['guests']}-guest home at this location ({money(mm)}). "
            f"The base case is the average of the two: <strong>{money(base)}</strong>. "
            f"The two methods are {pct(sc['methods_gap'], 1)} apart.")
    elif cm:
        parts.append(f"The base case is the median trailing-12-month revenue of the {n} comparable listings: "
                     f"<strong>{money(base)}</strong>. AirROI did not return a location estimate to cross-check it.")
    else:
        parts.append(f"The base case is AirROI's location estimate: <strong>{money(base)}</strong>.")

    rc_line = (f"<br><br><strong>Compared with the current summer rate card:</strong> {subject['name']}'s published "
               f"{rc['weeks']}-week summer schedule totals <strong>{money(rc['total'])}</strong> if every week sells. "
               f"That works out to {money(rc['implied_nightly'])} per night across {rc['nights']} nights. ")
    if rc["gap"] is not None:
        direction = "above" if rc["gap"] > 0 else "below"
        rc_line += (f"The rate card is {money(abs(rc['gap']))} {direction} the full-year comp-based base case. ")
    if rc["comp_summer_revenue"] is not None:
        rc_line += (("Based on the comp set's monthly AirROI revenue, " if comp_pattern else
                     "Based on AirROI's monthly seasonality for this location, ") +
                    f"{pct(rc['summer_share'])} of annual revenue falls in "
                    f"{MONTHS[subject['rate_card']['season_months'][0] - 1]}&ndash;"
                    f"{MONTHS[subject['rate_card']['season_months'][-1] - 1]}, about "
                    f"{money(rc['comp_summer_revenue'])} of the base case. ")
    if rc["adr_multiple"] is not None:
        rc_line += (f"The rate card's nightly equivalent is {rc['adr_multiple']:.1f}x the base-case ADR "
                    f"({money(sc['base']['adr'])}). ")
    rc_line += ("Why the two differ: the rate card is an asking price that assumes 100% of summer weeks sell. "
                "The comps are what Airbnb listings actually earned over the last 12 months, "
                "including their unbooked nights. Weekly agency rentals like this one are not in AirROI's "
                "Airbnb data, so the comps may not reflect this property's own booking history. "
                "Use the rate card as the summer ceiling and the comp-based numbers as the year-round, "
                "nightly-rental view.")
    return "".join(parts) + rc_line


def render(subject: dict, comps: list[dict], sc: dict, months: list[float] | None, rc: dict,
           notes: list[str], blanks: list[str], generated: dt.date | None = None,
           seasonal: dict | None = None, market_occ: dict | None = None) -> str:
    generated = generated or dt.date.today()
    n = len(comps)
    cons, base, opt = sc["conservative"], sc["base"], sc["optimistic"]
    days = sc["days_used"]

    def tier_sub(t):
        if not t or t.get("occupancy") is None:
            return ""
        line = f"{pct(t['occupancy'], 1)} occ &middot; {money(t['adr'])} ADR"
        if t.get("season_occ") is not None:
            line += (f"<br>Summer {pct(t['season_occ'])} at {money(sc['anchored']['rate'])}/night "
                     f"+ off-season {money_k(t['off_revenue'])}")
        return line

    adrs = [c["adr"] for c in comps if c.get("adr") is not None]
    adr_min = int(max(50, (min(adrs) if adrs else 200) * 0.5) // 25 * 25)
    adr_max = int(((max(adrs) if adrs else 1500) * 1.3) // 25 * 25 + 25)
    base_occ = round((base.get("occupancy") or 0.45) * 10000) / 100  # 0.01-point slider steps
    comp_pattern = bool(seasonal and seasonal.get("monthly_revenue"))
    base_adr = round(base.get("adr") or (adr_min + adr_max) / 2)
    base_adr = min(max(base_adr, adr_min), adr_max)
    occ_rng = sc["occ_range"]
    adr_rng = sc["adr_range"]

    rate_rows = "".join(
        f"<tr><td>{e(p['label'])}</td><td>{p['weeks']}</td><td>{money(p['weekly_rate'])}</td>"
        f"<td>{money(p['weeks'] * p['weekly_rate'])}</td></tr>" for p in subject["rate_card"]["periods"])
    highlights = "".join(f'<span class="badge">{e(h)}</span>' for h in subject["highlights"])
    data_notes = "".join(f"<li>{e(x)}</li>" for x in notes + blanks) or "<li>None.</li>"
    season = set(subject["rate_card"]["season_months"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<meta name="robots" content="noindex, nofollow">
<title>Short-Term Rental Income Analysis</title>
<style>
  :root {{ --navy:{NAVY}; --sage:{SAGE}; --cream:{CREAM}; --white:{WHITE}; color-scheme: only light; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ background: var(--cream); color: var(--navy); }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
         line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  .wrap {{ max-width: 1120px; margin: 0 auto; padding: 32px 16px 48px; }}
  h1, h2, h3, h4 {{ font-family: Georgia, "Times New Roman", serif; color: var(--navy); line-height: 1.2; }}
  h1 {{ font-size: 40px; }} h2 {{ font-size: 28px; margin-bottom: 14px; }} h3 {{ font-size: 20px; margin: 26px 0 12px; }}
  h4 {{ font-size: 17px; margin-bottom: 4px; }}
  .eyebrow {{ font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--sage); }}
  .muted {{ color: var(--sage); }} .small {{ font-size: 13px; }}
  section, header.top {{ background: var(--white); border: 1px solid var(--sage); border-radius: 18px; padding: 28px; margin-bottom: 26px; }}
  header.top {{ border-top: 6px solid var(--navy); display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; flex-wrap: wrap; }}
  .btn {{ background: var(--navy); color: var(--white); border: 0; border-radius: 10px; padding: 11px 18px; font-weight: 700; cursor: pointer; font-size: 14px; }}
  .subject {{ display: grid; grid-template-columns: 5fr 6fr; gap: 26px; }}
  .hero {{ width: 100%; aspect-ratio: 3/2; object-fit: cover; border-radius: 14px; display: block; }}
  .photo-missing {{ display: flex; align-items: center; justify-content: center; background: var(--cream); color: var(--sage); font-size: 14px; }}
  .badges {{ display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 12px; }}
  .badge {{ background: var(--cream); color: var(--navy); border: 1px solid var(--sage); border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 600; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }}
  th, td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--cream); }}
  th {{ background: var(--cream); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }}
  tr.total td {{ font-weight: 800; border-top: 2px solid var(--navy); }}
  .tiers {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 8px 0 10px; }}
  .tier {{ border: 2px solid var(--sage); border-radius: 16px; padding: 22px; text-align: center; background: var(--white); }}
  .tier .lbl {{ font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--sage); }}
  .tier .val {{ font-size: 34px; font-weight: 900; margin: 6px 0; color: var(--navy); }}
  .tier .sub {{ font-size: 13px; color: var(--sage); }}
  .tier.base {{ background: var(--navy); border-color: var(--navy); }}
  .tier.base .lbl, .tier.base .sub {{ color: var(--cream); }} .tier.base .val {{ color: var(--white); font-size: 40px; }}
  .derive {{ background: var(--cream); border-left: 5px solid var(--sage); border-radius: 10px; padding: 18px 20px; font-size: 14.5px; margin-top: 16px; }}
  .sliders {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }}
  .slider {{ background: var(--cream); border-radius: 14px; padding: 18px; }}
  .slider label {{ font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; display: block; }}
  .slider .row {{ display: flex; align-items: center; gap: 12px; margin: 10px 0 6px; }}
  .slider .out {{ font-size: 26px; font-weight: 900; min-width: 96px; text-align: right; }}
  input[type=range] {{ flex: 1; accent-color: {NAVY}; }}
  .projected {{ background: var(--navy); color: var(--white); border-radius: 16px; text-align: center; padding: 28px; margin-top: 20px; }}
  .projected .lbl {{ font-size: 13px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: var(--cream); }}
  .projected .val {{ font-size: 56px; font-weight: 900; margin: 4px 0; }}
  .projected .sub {{ color: var(--cream); font-size: 14px; }}
  .projected .fine {{ color: var(--cream); font-size: 12px; margin-top: 12px; }}
  .metric-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }}
  .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }}
  .metric {{ background: var(--cream); border-radius: 10px; padding: 10px 12px; min-height: 58px; }}
  .metric .k {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--sage); }}
  .metric .v {{ font-size: 18px; font-weight: 800; }}
  .chart {{ width: 100%; height: auto; display: block; }}
  .svg-val {{ font-size: 13px; font-weight: 700; fill: {NAVY}; }} .svg-lbl {{ font-size: 13px; fill: {NAVY}; }}
  .legend {{ display: flex; gap: 18px; font-size: 13px; margin-top: 8px; }}
  .sw {{ display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 6px; }}
  .comps {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
  .comp {{ border: 1px solid var(--sage); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background: var(--white); }}
  .comp-img {{ width: 100%; height: 190px; object-fit: cover; display: block; }}
  .comp-body {{ padding: 16px; flex: 1; }}
  .flag {{ display: inline-block; background: var(--navy); color: var(--white); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; border-radius: 6px; padding: 4px 8px; margin-bottom: 8px; }}
  .specs {{ font-size: 13px; font-weight: 600; margin-top: 6px; }}
  .card-link {{ display: block; text-align: center; background: var(--navy); color: var(--white); font-weight: 700; padding: 11px; text-decoration: none; font-size: 14px; }}
  .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }}
  .info {{ background: var(--cream); border-radius: 12px; padding: 18px; font-size: 14px; }}
  .info b.t {{ display: block; margin-bottom: 8px; font-size: 15px; }}
  .info ul {{ padding-left: 18px; }} .info li {{ margin: 4px 0; }}
  footer {{ text-align: center; font-size: 12px; color: var(--sage); margin-top: 18px; }}
  @media (max-width: 820px) {{
    .subject, .tiers, .sliders, .comps, .grid2 {{ grid-template-columns: 1fr; }}
    .kpis {{ grid-template-columns: repeat(2, 1fr); }} h1 {{ font-size: 30px; }} .projected .val {{ font-size: 40px; }}
  }}
  @media print {{
    @page {{ size: letter; margin: 0.45in; }}
    .no-print {{ display: none !important; }}
    .wrap {{ padding: 0; max-width: none; }}
    section, header.top {{ break-inside: avoid; }}
    section.comps-sec, section.method {{ break-inside: auto; }}
    .avoid-break {{ break-inside: avoid; }}
    .comps {{ grid-template-columns: repeat(2, 1fr); }}
  }}
</style>
</head>
<body>
<div class="wrap">

<header class="top">
  <div>
    <div class="eyebrow">Property Income Analysis</div>
    <h1>Short-Term Rental Income Analysis</h1>
    <p style="font-size:18px;font-weight:700;margin-top:8px">{e(subject['address'])}</p>
    <p class="muted small">Prepared {generated.strftime('%B %-d, %Y')} &middot; Comparable data: AirROI, trailing 12 months</p>
  </div>
  <button class="btn no-print" onclick="window.print()">Print / Save PDF</button>
</header>

<section>
  <div class="eyebrow">Subject Property</div>
  <h2>Listing &amp; Positioning</h2>
  <div class="subject">
    <div>{photo_block(subject.get('_photo'), subject['name'], 'hero')}</div>
    <div>
      <h3 style="margin-top:0">{e(subject['name'])}</h3>
      <div class="specs" style="font-size:15px">{subject['bedrooms']} Bedrooms &middot; {num(subject['baths'])} Baths &middot; Sleeps {subject['guests']} &middot; {e(subject['beds_note'])}</div>
      <p class="small" style="margin-top:6px">{e(subject['positioning'])}</p>
      <div class="badges">{highlights}</div>
      <div class="eyebrow" style="margin-top:14px">Current operation</div>
      <p class="small">{e(subject['rate_card']['note'])}</p>
      <table>
        <tr><th>Season</th><th>Weeks</th><th>Weekly rate</th><th>Total</th></tr>
        {rate_rows}
        <tr class="total"><td>Published summer total</td><td>{rc['weeks']}</td><td></td><td>{money(rc['total'])}</td></tr>
      </table>
    </div>
  </div>
</section>

<section>
  <div class="eyebrow">Revenue Projections</div>
  <h2>{'Year-Round Annual Revenue Projection' if sc.get('anchored') else 'Comp-Based Annual Revenue Projection'}</h2>
  <div class="tiers">
    <div class="tier"><div class="lbl">Conservative</div><div class="val">{money(cons and cons['revenue'])}</div><div class="sub">{tier_sub(cons)}</div></div>
    <div class="tier base"><div class="lbl">Base Case</div><div class="val">{money(base['revenue'])}</div><div class="sub">{tier_sub(base)}</div></div>
    <div class="tier"><div class="lbl">Optimistic</div><div class="val">{money(opt and opt['revenue'])}</div><div class="sub">{tier_sub(opt)}</div></div>
  </div>
  {anchored_footnote(sc, subject) if sc.get('anchored') else ''}
  <p class="muted small" style="text-align:center{';display:none' if sc.get('anchored') else ''}">Annual gross revenue. Based on trailing 12-month AirROI performance of {n} comparable properties. Occupancy is measured on open nights (nights booked &divide; nights open to guests); the comps' median is {days} open nights a year{'' if sc['days_from_comps'] else ' (AirROI did not return open nights, so 365 is used)'}.</p>
  {occupancy_note(comps, sc, market_occ, seasonal, subject['rate_card'].get('season_months'))}
  <div class="derive"><strong>How the base case is derived:</strong> {anchored_text(sc, rc, subject, n) if sc.get('anchored') else derivation_text(sc, rc, subject, n, comp_pattern)}</div>

  <h3>Interactive Performance Model</h3>
  <div class="sliders">
    <div class="slider"><label for="occ">Occupancy (open nights)</label>
      <div class="row"><input type="range" id="occ" min="5" max="100" step="0.01" value="{base_occ:g}"><div class="out"><span id="occV">{base_occ:g}</span>%</div></div>
      <div class="muted small">Comp range: {pct(occ_rng[0]) if occ_rng else ''}{' &ndash; ' + pct(occ_rng[1]) if occ_rng else ''}</div></div>
    <div class="slider"><label for="adr">Average Daily Rate</label>
      <div class="row"><input type="range" id="adr" min="{adr_min}" max="{adr_max}" step="1" value="{base_adr}"><div class="out">$<span id="adrV">{base_adr:,}</span></div></div>
      <div class="muted small">Comp range: {money(adr_rng[0]) if adr_rng else ''}{' &ndash; ' + money(adr_rng[1]) if adr_rng else ''}</div></div>
    <div class="slider"><label for="days">Days Available</label>
      <div class="row"><input type="range" id="days" min="60" max="365" step="1" value="{days}"><div class="out"><span id="daysV">{days}</span></div></div>
      <div class="muted small">Nights open to guests per year, after owner use and maintenance</div></div>
  </div>
  <div class="projected">
    <div class="lbl">Projected Annual Gross Revenue</div>
    <div class="val">$<span id="rev">{round(days * base_occ / 100 * base_adr):,}</span></div>
    <div class="sub"><span id="occS">{base_occ:g}</span>% occupancy of <span id="daysS">{days}</span> available nights at $<span id="adrS">{base_adr:,}</span> ADR</div>
    <div class="fine">Gross revenue before cleaning, platform fees, utilities, taxes, supplies and management.</div>
  </div>
  <div class="kpis">
    <div class="metric"><div class="k">Available Nights</div><div class="v" id="kAvail">{days}</div></div>
    <div class="metric"><div class="k">Booked Nights</div><div class="v" id="kBooked">{round(days * base_occ / 100)}</div></div>
    <div class="metric"><div class="k">ADR</div><div class="v" id="kAdr">${base_adr:,}</div></div>
    <div class="metric"><div class="k">Revenue per Available Night</div><div class="v" id="kRevpar">${round(base_occ / 100 * base_adr):,}</div></div>
  </div>
</section>

<section>
  <div class="eyebrow">Seasonality</div>
  <h2>Projected Monthly Revenue (Base Case)</h2>
  <p class="small" style="margin-bottom:10px">{'The base-case annual total spread across the year in proportion to the comp set&#39;s actual monthly revenue over the last 12 months (AirROI).' if comp_pattern else 'The base-case annual total spread across the year using AirROI&#39;s monthly revenue pattern for this location.'}</p>
  {monthly_svg(months, season)}
  <div class="legend"><span><span class="sw" style="background:{NAVY}"></span>Current rate-card season</span><span><span class="sw" style="background:{SAGE}"></span>Months not rented today</span></div>
</section>

{seasonal_block(seasonal)}
<section class="comps-sec">
  <div class="eyebrow">Market Comparables</div>
  <h2>Comparable Properties: AirROI Performance</h2>
  <p class="small" style="margin-bottom:16px">Trailing 12-month performance reported by AirROI. Blank fields were not returned by AirROI and have not been estimated.</p>
  {larger_note(comps, subject)}
  <div class="comps">{''.join(comp_card(c, subject['bedrooms'], subject['rate_card'].get('season_months')) for c in comps)}</div>
</section>

<section class="method">
  <div class="eyebrow">Methodology</div>
  <h2>Assumptions &amp; Methodology</h2>
  <div class="grid2">
    <div class="info"><b class="t">Comp selection</b><ul>
      <li>{e(subject['criteria_text'])}</li>
      {selection_lines(subject['criteria'])}</ul></div>
    <div class="info"><b class="t">Scenario math</b><ul>
      {scenario_lines(sc, days)}</ul></div>
    <div class="info"><b class="t">Data sources</b><ul>
      <li><b>AirROI</b> {e(endpoints_used(subject['criteria']))}: comp revenue, occupancy, ADR, availability, monthly performance and AirROI's location estimate</li>
      <li><b>Published rate card:</b> {e(subject['rate_card']['source'])}</li>
      <li>Raw AirROI responses are saved alongside this report</li></ul></div>
    <div class="info"><b class="t">Data notes</b><ul>{data_notes}</ul></div>
  </div>
  <div class="derive" style="margin-top:18px"><strong>Disclaimer:</strong> Figures are estimated gross revenue based on comparable-property performance. They are before cleaning, platform commissions, utilities, property taxes, maintenance, supplies, insurance and management fees. Actual results depend on pricing, operations, regulations and market conditions. This is not financial or investment advice.</div>
</section>

<footer>Report generated {generated.strftime('%B %-d, %Y')}</footer>
</div>
<script>
(function () {{
  var $ = function (id) {{ return document.getElementById(id); }};
  function upd() {{
    var o = +$('occ').value, a = +$('adr').value, d = +$('days').value;
    var booked = Math.round(d * o / 100), rev = Math.round(d * o / 100 * a);
    $('occV').textContent = o; $('adrV').textContent = a.toLocaleString(); $('daysV').textContent = d;
    $('rev').textContent = rev.toLocaleString(); $('occS').textContent = o; $('daysS').textContent = d;
    $('adrS').textContent = a.toLocaleString(); $('kAvail').textContent = d; $('kBooked').textContent = booked;
    $('kAdr').textContent = '$' + a.toLocaleString(); $('kRevpar').textContent = '$' + Math.round(rev / d).toLocaleString();
  }}
  ['occ', 'adr', 'days'].forEach(function (id) {{ $(id).addEventListener('input', upd); $(id).addEventListener('change', upd); }});
  upd();
}})();
</script>
</body>
</html>
"""
