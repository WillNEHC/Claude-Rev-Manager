/**
 * Guest Experience & Reviews department — review scanner.
 *
 * Input: our OWN guest reviews as Hospitable returns them (Public API v2
 * review object; also what the Zapier "Hospitable → Reviews" action returns).
 * Shape documented at developer.hospitable.com (Reviews → respond to a review).
 *
 * Output, per property and overall:
 *  - average public rating and review count
 *  - average of each category score (cleanliness, communication, …)
 *  - every review under 5 stars, with the guest's own words
 *  - reviews still waiting for a public host response
 *  - private feedback (the guest's note to the host only — the most honest data)
 *  - recurring themes across public text + private feedback, each with the
 *    exact quotes that triggered it, so nothing is asserted without evidence
 *
 * Pure arithmetic and keyword matching. It never invents a review, a score or a theme.
 */

export interface HospitableReview {
  id: string;
  platform?: string; // airbnb | vrbo | booking | direct ...
  public?: { rating?: number | null; review?: string | null; response?: string | null };
  private?: {
    feedback?: string | null;
    detailed_ratings?: { type: string; rating: number | null; comment?: string | null }[];
  };
  responded_at?: string | null;
  reviewed_at?: string | null;
  can_respond?: boolean;
  guest?: { first_name?: string | null; last_name?: string | null };
  reservation?: { code?: string | null; check_in?: string | null; check_out?: string | null };
  property?: { id?: string; name?: string | null; public_name?: string | null };
}

/** Themes we track. Keywords are lower-case substrings; edit as we learn. */
export const THEMES: Record<string, string[]> = {
  cleanliness: ["dirty", "clean", "dust", "hair", "stain", "smell", "odor", "mold", "crumbs"],
  "check-in & access": ["check-in", "check in", "checkin", "lockbox", "code", "key", "door", "parking", "directions"],
  "heat / hot water / AC": ["cold", "heat", "heater", "thermostat", "hot water", "freezing", "a/c", "air conditioning"],
  "wifi & TV": ["wifi", "wi-fi", "internet", "tv", "streaming", "netflix"],
  "beds & sleep": ["bed", "mattress", "pillow", "sheets", "uncomfortable", "noise", "noisy", "loud"],
  "kitchen & supplies": ["kitchen", "coffee", "towel", "toilet paper", "supplies", "pots", "pans", "soap"],
  "hot tub / sauna / amenities": ["hot tub", "sauna", "fire pit", "grill", "game room", "pool", "lake", "dock"],
  "communication & host": ["responsive", "communication", "host", "quick", "helpful", "message"],
  "accuracy / as described": ["as described", "accurate", "photos", "pictures", "misleading", "smaller than"],
  "value / price": ["price", "value", "expensive", "worth", "fee"],
};

export interface ThemeHit {
  theme: string;
  reviews: number;
  quotes: { reviewId: string; property: string; rating: number | null; text: string }[];
}

export interface PropertySummary {
  property: string;
  reviews: number;
  avgRating: number | null;
  categoryAverages: Record<string, number>;
  below5: { reviewId: string; rating: number; guest: string; date: string | null; text: string }[];
  awaitingResponse: { reviewId: string; rating: number | null; guest: string; date: string | null }[];
  privateFeedback: { reviewId: string; rating: number | null; text: string }[];
}

export interface ReviewScan {
  total: number;
  avgRating: number | null;
  fiveStarShare: number | null; // 0–1
  properties: PropertySummary[];
  themes: ThemeHit[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Booking.com scores are out of 10; everything else out of 5. */
export function normalizedRating(rv: HospitableReview): number | null {
  const raw = rv.public?.rating;
  if (raw === null || raw === undefined || !Number.isFinite(raw) || raw <= 0) return null;
  return rv.platform === "booking" && raw > 5 ? r2(raw / 2) : raw;
}

const propName = (rv: HospitableReview) =>
  rv.property?.public_name || rv.property?.name || rv.property?.id || "Unknown property";
const guestName = (rv: HospitableReview) =>
  [rv.guest?.first_name, rv.guest?.last_name ? rv.guest.last_name[0] + "." : ""].filter(Boolean).join(" ") || "Guest";

function snippetAround(text: string, kw: string, width = 90): string {
  const i = text.toLowerCase().indexOf(kw);
  if (i < 0) return text.slice(0, width * 2);
  const start = Math.max(0, i - width);
  return (start > 0 ? "…" : "") + text.slice(start, i + kw.length + width).trim() + (i + kw.length + width < text.length ? "…" : "");
}

export function scanReviews(reviews: HospitableReview[]): ReviewScan {
  const byProp = new Map<string, HospitableReview[]>();
  for (const rv of reviews) {
    const k = propName(rv);
    byProp.set(k, [...(byProp.get(k) ?? []), rv]);
  }

  const properties: PropertySummary[] = [...byProp.entries()].map(([property, list]) => {
    const rated = list.map(normalizedRating).filter((x): x is number => x !== null);
    const cats = new Map<string, number[]>();
    for (const rv of list)
      for (const d of rv.private?.detailed_ratings ?? [])
        if (d.rating && d.rating > 0) cats.set(d.type, [...(cats.get(d.type) ?? []), d.rating]);
    return {
      property,
      reviews: list.length,
      avgRating: rated.length ? r2(rated.reduce((a, b) => a + b, 0) / rated.length) : null,
      categoryAverages: Object.fromEntries(
        [...cats.entries()].map(([k, v]) => [k, r2(v.reduce((a, b) => a + b, 0) / v.length)]),
      ),
      below5: list
        .filter((rv) => {
          const n = normalizedRating(rv);
          return n !== null && n < 5;
        })
        .map((rv) => ({
          reviewId: rv.id,
          rating: normalizedRating(rv)!,
          guest: guestName(rv),
          date: rv.reviewed_at ?? null,
          text: rv.public?.review ?? "",
        })),
      awaitingResponse: list
        .filter((rv) => rv.can_respond && !rv.public?.response)
        .map((rv) => ({ reviewId: rv.id, rating: normalizedRating(rv), guest: guestName(rv), date: rv.reviewed_at ?? null })),
      privateFeedback: list
        .filter((rv) => (rv.private?.feedback ?? "").trim())
        .map((rv) => ({ reviewId: rv.id, rating: normalizedRating(rv), text: rv.private!.feedback!.trim() })),
    };
  });

  const themes: ThemeHit[] = [];
  for (const [theme, kws] of Object.entries(THEMES)) {
    const quotes: ThemeHit["quotes"] = [];
    for (const rv of reviews) {
      const texts = [rv.public?.review ?? "", rv.private?.feedback ?? "", ...(rv.private?.detailed_ratings ?? []).map((d) => d.comment ?? "")];
      for (const t of texts) {
        const kw = kws.find((k) => t.toLowerCase().includes(k));
        if (kw) {
          quotes.push({ reviewId: rv.id, property: propName(rv), rating: normalizedRating(rv), text: snippetAround(t, kw) });
          break;
        }
      }
    }
    if (quotes.length) themes.push({ theme, reviews: new Set(quotes.map((q) => q.reviewId)).size, quotes });
  }
  themes.sort((a, b) => b.reviews - a.reviews);

  const all = reviews.map(normalizedRating).filter((x): x is number => x !== null);
  return {
    total: reviews.length,
    avgRating: all.length ? r2(all.reduce((a, b) => a + b, 0) / all.length) : null,
    fiveStarShare: all.length ? r2(all.filter((x) => x >= 5).length / all.length) : null,
    properties,
    themes,
  };
}

export function renderReviewScan(s: ReviewScan): string {
  const L: string[] = [];
  L.push(`**${s.total} reviews** · avg ${s.avgRating ?? "—"}★ · ${s.fiveStarShare !== null ? Math.round(s.fiveStarShare * 100) + "% five-star" : "—"}`);
  L.push("");
  L.push("| Property | Reviews | Avg ★ | Under 5★ | Awaiting reply | Private notes |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const p of s.properties)
    L.push(`| ${p.property} | ${p.reviews} | ${p.avgRating ?? "—"} | ${p.below5.length} | ${p.awaitingResponse.length} | ${p.privateFeedback.length} |`);
  for (const p of s.properties) {
    const cats = Object.entries(p.categoryAverages).sort((a, b) => a[1] - b[1]);
    if (cats.length) L.push(`\n**${p.property} — category scores (lowest first):** ` + cats.map(([k, v]) => `${k} ${v}`).join(" · "));
    for (const b of p.below5) L.push(`- ${b.rating}★ ${b.guest} (${b.date?.slice(0, 10) ?? "?"}): "${b.text.slice(0, 240)}"`);
    for (const f of p.privateFeedback) L.push(`- 🔒 private (${f.rating ?? "?"}★): "${f.text.slice(0, 240)}"`);
  }
  if (s.themes.length) {
    L.push("\n**Themes (mentions, with evidence)**");
    for (const t of s.themes) L.push(`- ${t.theme}: ${t.reviews} review(s) — e.g. "${t.quotes[0]!.text}"`);
  }
  return L.join("\n");
}
