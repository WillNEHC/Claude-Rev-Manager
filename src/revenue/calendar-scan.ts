/**
 * Revenue & Pricing department — price-calendar scanner.
 *
 * Reads the daily price calendar PriceLabs returns for one listing
 * (`get_listing_prices` / POST /mcp/api/listing_prices) and turns it into the
 * specific, dollar-quantified problems a revenue manager looks for:
 *
 *  - Min-price floor: open nights where PriceLabs' own algorithm wanted a
 *    LOWER price than our minimum, so the minimum is what the guest sees.
 *    Those nights are priced above what the market model thinks will sell.
 *  - Orphan gaps: short open runs between bookings/blocks that are shorter
 *    than the minimum stay, so nobody is allowed to book them.
 *  - Peak windows: how much of each holiday/ski week is still unsold, and at
 *    what price, so the highest-value nights get attention first.
 *  - Month summary: open / booked / blocked nights per month.
 *
 * Everything here is arithmetic on the PriceLabs payload. It invents nothing:
 * if a field is missing the night is skipped, not guessed.
 */

export interface PriceDay {
  date: string; // YYYY-MM-DD
  price: number; // final recommended price
  user_price: number; // price pushed to channels; -1 when booked/blocked
  uncustomized_price: number; // what the algorithm wanted before our min/max/customizations
  min_stay: number;
  booking_status: string; // "" (open), "Booked", "Booked (Check-In)", "Blocked"...
  unbookable?: number;
  demand_desc?: string;
}

export interface ListingSettings {
  listingId: string;
  name: string;
  min: number;
  base: number;
  max: number;
}

export interface PeakWindow {
  name: string;
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
}

/**
 * New England demand peaks for the 2026–27 winter season.
 * Holiday dates are computed from the calendar (Thanksgiving = 4th Thursday of
 * Nov, MLK = 3rd Monday of Jan, Presidents' Day = 3rd Monday of Feb), not from
 * any resort's published schedule. Edit or extend per season.
 */
export const PEAKS_2026_27: PeakWindow[] = [
  { name: "Thanksgiving week", start: "2026-11-25", end: "2026-11-29" },
  { name: "Christmas to New Year", start: "2026-12-19", end: "2027-01-02" },
  { name: "MLK weekend", start: "2027-01-15", end: "2027-01-17" },
  { name: "Presidents' week", start: "2027-02-12", end: "2027-02-20" },
];

export type NightState = "open" | "booked" | "blocked";

export function nightState(d: PriceDay): NightState {
  const s = (d.booking_status ?? "").toLowerCase();
  if (s.startsWith("booked")) return "booked";
  if (s.includes("block") || d.user_price === -1) return "blocked";
  return "open";
}

export interface FloorNight {
  date: string;
  listedPrice: number;
  algorithmPrice: number;
}

export interface OrphanGap {
  start: string;
  nights: number;
  minStay: number;
}

export interface PeakStatus {
  name: string;
  nights: number;
  open: number;
  booked: number;
  blocked: number;
  avgOpenPrice: number | null;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  open: number;
  booked: number;
  blocked: number;
}

export interface CalendarScan {
  listing: ListingSettings;
  from: string;
  to: string;
  floorNights: FloorNight[];
  /** Open nights where the listed price sits at the minimum and the algorithm wanted less. */
  floorNightCount: number;
  /** Average $ gap between our listed price and the algorithm's price on floor nights. */
  avgFloorGap: number | null;
  /** Lowest algorithm price seen on a floor night — a data point for where a new minimum could sit. */
  lowestAlgorithmPrice: number | null;
  /** Open nights pinned at our max price while the algorithm wanted MORE. */
  capNights: FloorNight[];
  capNightCount: number;
  /** Average $ the algorithm wanted above our max on capped nights. */
  avgCapGap: number | null;
  orphanGaps: OrphanGap[];
  peaks: PeakStatus[];
  months: MonthSummary[];
}

const round = (n: number) => Math.round(n);

export function scanCalendar(
  listing: ListingSettings,
  days: PriceDay[],
  peaks: PeakWindow[] = PEAKS_2026_27,
): CalendarScan {
  const sorted = [...days]
    .filter((d) => typeof d.date === "string" && Number.isFinite(d.price))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 1) Min-price floor nights.
  const floorNights: FloorNight[] = [];
  for (const d of sorted) {
    if (nightState(d) !== "open") continue;
    if (!Number.isFinite(d.uncustomized_price) || d.uncustomized_price <= 0) continue;
    const listed = d.user_price > 0 ? d.user_price : d.price;
    if (listed <= listing.min && d.uncustomized_price < listing.min) {
      floorNights.push({ date: d.date, listedPrice: listed, algorithmPrice: d.uncustomized_price });
    }
  }
  const avgFloorGap = floorNights.length
    ? round(floorNights.reduce((s, f) => s + (f.listedPrice - f.algorithmPrice), 0) / floorNights.length)
    : null;
  const lowestAlgorithmPrice = floorNights.length
    ? Math.min(...floorNights.map((f) => f.algorithmPrice))
    : null;

  // 1b) Max-price ceiling nights: the mirror image of the floor. These are
  //     often the most valuable nights of the year (holidays, ski weeks).
  const capNights: FloorNight[] = [];
  for (const d of sorted) {
    if (nightState(d) !== "open") continue;
    if (!Number.isFinite(d.uncustomized_price) || d.uncustomized_price <= 0) continue;
    const listed = d.user_price > 0 ? d.user_price : d.price;
    if (listed >= listing.max && d.uncustomized_price > listing.max) {
      capNights.push({ date: d.date, listedPrice: listed, algorithmPrice: d.uncustomized_price });
    }
  }
  const avgCapGap = capNights.length
    ? round(capNights.reduce((s, f) => s + (f.algorithmPrice - f.listedPrice), 0) / capNights.length)
    : null;

  // 2) Orphan gaps: an open run bounded by booked/blocked nights on both sides
  //    whose length is below the min stay required on its first night.
  const orphanGaps: OrphanGap[] = [];
  let i = 0;
  while (i < sorted.length) {
    if (nightState(sorted[i]!) !== "open") {
      i++;
      continue;
    }
    const startIdx = i;
    while (i < sorted.length && nightState(sorted[i]!) === "open") i++;
    const boundedLeft = startIdx > 0;
    const boundedRight = i < sorted.length;
    const run = i - startIdx;
    const minStay = sorted[startIdx]!.min_stay ?? 1;
    if (boundedLeft && boundedRight && run < minStay) {
      orphanGaps.push({ start: sorted[startIdx]!.date, nights: run, minStay });
    }
  }

  // 3) Peak windows.
  const peakStatus: PeakStatus[] = peaks.map((p) => {
    const inWin = sorted.filter((d) => d.date >= p.start && d.date <= p.end);
    const open = inWin.filter((d) => nightState(d) === "open");
    return {
      name: p.name,
      nights: inWin.length,
      open: open.length,
      booked: inWin.filter((d) => nightState(d) === "booked").length,
      blocked: inWin.filter((d) => nightState(d) === "blocked").length,
      avgOpenPrice: open.length
        ? round(open.reduce((s, d) => s + (d.user_price > 0 ? d.user_price : d.price), 0) / open.length)
        : null,
    };
  });

  // 4) Month summary.
  const byMonth = new Map<string, MonthSummary>();
  for (const d of sorted) {
    const m = d.date.slice(0, 7);
    const row = byMonth.get(m) ?? { month: m, open: 0, booked: 0, blocked: 0 };
    row[nightState(d)]++;
    byMonth.set(m, row);
  }

  return {
    listing,
    from: sorted[0]?.date ?? "",
    to: sorted[sorted.length - 1]?.date ?? "",
    floorNights,
    floorNightCount: floorNights.length,
    avgFloorGap,
    lowestAlgorithmPrice,
    capNights,
    capNightCount: capNights.length,
    avgCapGap,
    orphanGaps,
    peaks: peakStatus,
    months: [...byMonth.values()],
  };
}

/** Plain-English markdown summary, written for an owner rather than an analyst. */
export function renderScan(s: CalendarScan): string {
  const L: string[] = [];
  const { listing } = s;
  L.push(`### ${listing.name}`);
  L.push(`Settings: min $${listing.min} · base $${listing.base} · max $${listing.max} · window ${s.from} → ${s.to}`);
  L.push("");
  if (s.floorNightCount) {
    L.push(
      `- **Minimum price is the floor on ${s.floorNightCount} open nights.** PriceLabs wanted to charge less ` +
        `(avg $${s.avgFloorGap} lower; lowest $${s.lowestAlgorithmPrice}) but the $${listing.min} minimum stopped it.`,
    );
  } else {
    L.push(`- Minimum price is not blocking any open nights.`);
  }
  if (s.capNightCount) {
    L.push(
      `- **Maximum price is the ceiling on ${s.capNightCount} open nights.** PriceLabs wanted to charge more ` +
        `(avg $${s.avgCapGap} above the $${listing.max} max). Check these against market comps before raising the max: ` +
        `the algorithm's number is a signal, not proof the night will sell at that price.`,
    );
  }
  if (s.orphanGaps.length) {
    const g = s.orphanGaps.map((o) => `${o.start} (${o.nights}n gap, ${o.minStay}n min)`).join("; ");
    L.push(`- **${s.orphanGaps.length} unbookable gap(s)** shorter than the minimum stay: ${g}.`);
  }
  L.push("");
  L.push("| Peak | Nights | Booked | Blocked | Open | Avg open price |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const p of s.peaks) {
    if (!p.nights) continue;
    L.push(`| ${p.name} | ${p.nights} | ${p.booked} | ${p.blocked} | ${p.open} | ${p.avgOpenPrice ? "$" + p.avgOpenPrice : "—"} |`);
  }
  L.push("");
  L.push("| Month | Booked | Blocked | Open |");
  L.push("| --- | --- | --- | --- |");
  for (const m of s.months) L.push(`| ${m.month} | ${m.booked} | ${m.blocked} | ${m.open} |`);
  return L.join("\n");
}
