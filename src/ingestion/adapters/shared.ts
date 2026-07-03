import type { PlatformSource, RawReview } from "../types";

/**
 * Helpers shared across source adapters. The review shape is identical across
 * platforms, so parsing/normalization lives here; each adapter only maps its
 * source-specific listing fields.
 */

/** Normalize a free-form review date to ISO YYYY-MM-DD, or undefined. */
export function toIsoDate(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(input.trim());
  if (m) {
    const d = new Date(`${m[1]} 1, ${m[2]}`);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

/** Coerce a scalar to a finite number, stripping currency/formatting. */
export function numeric(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Extract the first capture group of `re` from a URL. */
export function extractIdFromUrl(url: string | undefined, re: RegExp): string | undefined {
  if (!url) return undefined;
  const m = re.exec(url);
  return m ? m[1] : undefined;
}

/** Common review shape from any source's extract schema. */
export interface RawSourceReview {
  id?: string;
  author?: string;
  date?: string;
  rating?: number;
  text?: string;
}

/** Map raw extracted reviews to RawReview[], dropping empties. */
export function parseReviews(raws: RawSourceReview[], source: PlatformSource): RawReview[] {
  const out: RawReview[] = [];
  for (const r of raws) {
    const body = (r.text ?? "").trim();
    if (!body) continue; // a review with no text is not usable evidence
    out.push({
      source,
      sourceReviewId: r.id,
      authorName: r.author?.trim() || undefined,
      reviewDate: toIsoDate(r.date),
      rating: numeric(r.rating),
      language: "en",
      body,
    });
  }
  return out;
}

/** Firecrawl extract schema for a review list (shared across adapters). */
export const REVIEW_LIST_SCHEMA = {
  type: "object",
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          author: { type: "string" },
          date: { type: "string" },
          rating: { type: "number" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;
