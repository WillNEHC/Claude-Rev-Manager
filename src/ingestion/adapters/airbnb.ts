import type { FirecrawlClient } from "../../lib/firecrawl/client";
import type { CandidateListing, RawReview, SourceAdapter, MarketConfig } from "../types";

/**
 * Airbnb source adapter. The parsing functions are pure and exported so they
 * can be tested against saved fixtures without network. The class orchestrates
 * Firecrawl calls (search -> extract listings -> extract reviews) and delegates
 * all shape-mapping to the parsers.
 *
 * NOTE: Airbnb's Terms of Service restrict scraping (see docs/15). This adapter
 * is written behind the SourceAdapter interface so it can be enabled/disabled by
 * config; enabling it is a deliberate, configured decision.
 */

/** Raw listing shape we ask Firecrawl's extract to return. */
export interface RawAirbnbListing {
  id?: string;
  url?: string;
  title?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
  price?: number;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
  isSuperhost?: boolean;
  amenities?: string[];
  description?: string;
  hostName?: string;
  hostId?: string;
}

export interface RawAirbnbReview {
  id?: string;
  author?: string;
  date?: string;
  rating?: number;
  text?: string;
}

/** Normalize a free-form review date to ISO YYYY-MM-DD, or undefined. */
export function toIsoDate(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  // "March 2024" style -> first of month.
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(input.trim());
  if (m) {
    const d = new Date(`${m[1]} 1, ${m[2]}`);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

/** Map a raw extracted listing to a CandidateListing, or null if unusable. */
export function parseListing(raw: RawAirbnbListing): CandidateListing | null {
  const platformListingId = raw.id ?? extractIdFromUrl(raw.url);
  if (!platformListingId || !raw.url || !raw.title) return null;

  const descriptionText = [raw.title, raw.description, ...(raw.amenities ?? [])]
    .filter(Boolean)
    .join(" ");

  return {
    platform: "airbnb",
    platformListingId,
    url: raw.url,
    title: raw.title,
    propertyType: raw.propertyType,
    bedrooms: numeric(raw.bedrooms),
    bathrooms: numeric(raw.bathrooms),
    maxGuests: numeric(raw.guests),
    nightlyRateUsd: numeric(raw.price),
    ratingOverall: numeric(raw.rating),
    reviewCount: numeric(raw.reviewsCount),
    lat: numeric(raw.latitude),
    lng: numeric(raw.longitude),
    isSuperhost: raw.isSuperhost,
    amenities: raw.amenities ?? [],
    descriptionText,
    host: {
      platformHostId: raw.hostId,
      displayName: raw.hostName,
      isSuperhost: raw.isSuperhost,
    },
  };
}

/** Map raw extracted reviews to RawReview[], dropping empties. */
export function parseReviews(raws: RawAirbnbReview[]): RawReview[] {
  const out: RawReview[] = [];
  for (const r of raws) {
    const body = (r.text ?? "").trim();
    if (!body) continue; // a review with no text is not usable evidence
    out.push({
      source: "airbnb",
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

export function extractIdFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = /\/rooms\/(?:plus\/)?(\d+)/.exec(url);
  return m ? m[1] : undefined;
}

function numeric(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/* --- Firecrawl-backed adapter -------------------------------------------- */

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    url: { type: "string" },
    title: { type: "string" },
    propertyType: { type: "string" },
    bedrooms: { type: "number" },
    bathrooms: { type: "number" },
    guests: { type: "number" },
    price: { type: "number" },
    rating: { type: "number" },
    reviewsCount: { type: "number" },
    isSuperhost: { type: "boolean" },
    amenities: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    hostName: { type: "string" },
    hostId: { type: "string" },
  },
} as const;

export class AirbnbAdapter implements SourceAdapter {
  readonly source = "airbnb" as const;
  readonly supportsChangeDetection = true;

  constructor(private readonly fc: FirecrawlClient) {}

  async discoverListings(market: MarketConfig): Promise<CandidateListing[]> {
    const urls = await this.searchListingUrls(market);
    const candidates: CandidateListing[] = [];
    for (const url of urls) {
      try {
        const raw = await this.fc.post<{ data: RawAirbnbListing }>("/v1/extract", {
          urls: [url],
          schema: LISTING_SCHEMA,
        });
        const parsed = parseListing({ ...raw.data, url });
        if (parsed) candidates.push(parsed);
      } catch {
        // Graceful failure: a single listing extract failure degrades that
        // listing, not the whole run. The pipeline logs skips.
      }
    }
    return candidates;
  }

  async fetchReviews(listing: CandidateListing, _since?: Date): Promise<RawReview[]> {
    const raw = await this.fc.post<{ data: { reviews?: RawAirbnbReview[] } }>("/v1/extract", {
      urls: [`${listing.url}/reviews`],
      schema: {
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
      },
    });
    return parseReviews(raw.data.reviews ?? []);
  }

  private async searchListingUrls(market: MarketConfig): Promise<string[]> {
    const urls = new Set<string>();
    for (const term of market.search_terms.length ? market.search_terms : [market.name]) {
      const res = await this.fc.post<{ data?: { url?: string }[] }>("/v1/search", {
        query: `${term} airbnb`,
        limit: 20,
      });
      for (const item of res.data ?? []) {
        if (item.url && /airbnb\.[a-z.]+\/rooms\//.test(item.url)) urls.add(item.url);
      }
    }
    return [...urls];
  }
}
