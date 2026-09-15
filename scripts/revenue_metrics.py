#!/usr/bin/env python3
"""NEHC revenue metrics. Pure arithmetic over a PriceLabs bookings export.
No LLM calls. Occupancy is computed on NIGHTS, allocated to the month each night falls in,
so a stay spanning a month boundary is split rather than double-counted."""
import json, sys, calendar
from datetime import date, timedelta
from collections import defaultdict

PROPS = {
    "1145414": ("183 Flagstone, Nashua NH", 3),
    "912900":  ("672 Amory, Manchester NH", 4),
    "8e787b69-4ece-4241-a47c-f2b8ae540290": ("61 Pleasant, Ludlow VT", 3),
}
# Listing live-from dates, inferred from the earliest reservation actually seen per property.
TODAY = date(2026, 9, 15)

def load(path):
    d = json.load(open(path))
    return d["data"]["data"]["reservations"]

def d_of(ms):
    return date(1970,1,1) + timedelta(milliseconds=ms)

def main(path):
    res = load(path)
    # per property: nights by month, revenue by month (revenue allocated per-night, pro rata)
    nights = defaultdict(lambda: defaultdict(int))
    rev    = defaultdict(lambda: defaultdict(float))
    stays  = defaultdict(list)
    first_seen = {}

    for r in res:
        lid = r["listing_id"]
        if lid not in PROPS: continue
        ci, co = d_of(r["start_date"]), d_of(r["end_date"])
        n = (co - ci).days
        if n <= 0: continue
        rr = float(r.get("rental_revenue") or 0)
        per_night = rr / n
        first_seen[lid] = min(first_seen.get(lid, ci), ci)
        stays[lid].append({
            "id": r["reservation_id"], "ci": ci, "co": co, "n": n,
            "rev": rr, "src": r.get("booking_source"), "lead": r.get("lead_time"),
            "booked": d_of(r["booked_time"]),
        })
        for i in range(n):
            day = ci + timedelta(days=i)
            k = (day.year, day.month)
            nights[lid][k] += 1
            rev[lid][k]    += per_night

    print("="*96)
    print("NEHC REVENUE — computed from PriceLabs bookings (status: booked). Generated", TODAY)
    print("Occupancy = booked nights / calendar nights. Nights split across month boundaries.")
    print("="*96)

    portfolio = defaultdict(lambda: [0,0.0,0])
    for lid,(name,br) in PROPS.items():
        s = stays[lid]
        if not s:
            print(f"\n{name}: no reservations\n"); continue
        live = first_seen[lid]
        print(f"\n### {name}  ({br}BR)   first reservation: {live:%b %Y}   stays: {len(s)}")
        print(f"{'Month':<9}{'Nts':>5}{'Avail':>7}{'Occ%':>7}{'Revenue':>11}{'ADR':>9}{'RevPAR':>9}")
        keys = sorted(set(list(nights[lid].keys())))
        for k in keys:
            y,m = k
            dim = calendar.monthrange(y,m)[1]
            mstart, mend = date(y,m,1), date(y,m,dim)
            if mend < live: continue
            avail = dim
            if mstart < live: avail = (mend - live).days + 1
            future = mstart > TODAY
            n_ = nights[lid][k]; r_ = rev[lid][k]
            occ = 100*n_/avail if avail else 0
            adr = r_/n_ if n_ else 0
            revpar = r_/avail if avail else 0
            tag = "  (forward)" if future else ("  (partial)" if mstart <= TODAY <= mend else "")
            print(f"{calendar.month_abbr[m]} {y:<4}{n_:>5}{avail:>7}{occ:>6.0f}%{r_:>11,.0f}{adr:>9,.0f}{revpar:>9,.0f}{tag}")
            if not future:
                p = portfolio[k]; p[0]+=n_; p[1]+=r_; p[2]+=avail

        # trailing performance to date
        done = [x for x in s if x["co"] <= TODAY]
        if done:
            tot_n = sum(x["n"] for x in done); tot_r = sum(x["rev"] for x in done)
            los = tot_n/len(done); lead = sum(x["lead"] or 0 for x in done)/len(done)
            print(f"  → completed stays {len(done)} | nights {tot_n} | revenue ${tot_r:,.0f} "
                  f"| ADR ${tot_r/tot_n:,.0f} | avg LOS {los:.1f} nts | avg lead {lead:.0f} d")
        ch = defaultdict(lambda: [0,0.0])
        for x in s:
            ch[x["src"]][0]+=1; ch[x["src"]][1]+=x["rev"]
        mix = " · ".join(f"{k}: {v[0]} (${v[1]:,.0f})" for k,v in sorted(ch.items(), key=lambda i:-i[1][1]))
        print(f"  → channel mix: {mix}")

    print("\n" + "="*96)
    print("PORTFOLIO — completed months only")
    print(f"{'Month':<9}{'Nts':>6}{'Avail':>7}{'Occ%':>7}{'Revenue':>12}{'RevPAR':>9}")
    for k in sorted(portfolio):
        n_,r_,a_ = portfolio[k]
        print(f"{calendar.month_abbr[k[1]]} {k[0]:<4}{n_:>6}{a_:>7}{100*n_/a_:>6.0f}%{r_:>12,.0f}{r_/a_:>9,.0f}")
    tn = sum(v[0] for v in portfolio.values()); tr = sum(v[1] for v in portfolio.values())
    ta = sum(v[2] for v in portfolio.values())
    print("-"*96)
    print(f"{'TOTAL':<9}{tn:>6}{ta:>7}{100*tn/ta:>6.0f}%{tr:>12,.0f}{tr/ta:>9,.0f}")
    print("\nNOTE: 'Revenue' is PriceLabs rental_revenue. Whether that figure is GROSS or NET of")
    print("the OTA fee is UNVERIFIED (see registry/contract-terms.yaml). On Airbnb that is a")
    print("15.5% swing. These figures are directionally sound for occupancy and pacing;")
    print("do NOT use them for an owner payout until that is settled.")

if __name__ == "__main__":
    main(sys.argv[1])
