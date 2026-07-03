import type { FirecrawlClient } from "../../lib/firecrawl/client";
import type { CandidateListing, RawReview, SourceAdapter, MarketConfig } from "../types";
import { numeric, extractIdFromUrl, parseReviews, REVIEW_LIST_SCHEMA, type RawSourceReview } from "./shared";

/**
 * Booking.com source adapter. Booking has no "superhost" badge, so — per the
 * spec's "or equivalent where applicable" — we treat a high review score
 * (>= 9.0 / 10) as the quality equivalent, and normalize the 0–10 score to 0–5.
 */

export interface RawBookingListing {
  id?: string;
  url?: string;
  title?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxOccupancy?: number;
  price?: number;
  reviewScore?: number; // 0–10 on Booking
  reviewCount?: number;
  amenities?: string[];
  description?: string;
}

const SUPERHOST_SCORE = 9.0;
const ID_RE = /\/hotel\/[a-z]{2}\/([a-z0-9-]+)/i;

export function bookingListingId(url?: string): string | undefined {
  return extractIdFromUrl(url, ID_RE);
}

/** Normalize Booking's 0–10 score to the 0–5 rating scale used everywhere else. */
export function normalizeScore(score?: number): number | undefined {
  const n = numeric(score);
  return n === undefined ? undefined : Math.round((n / 2) * 100) / 100;
}

export function parseBookingListing(raw: RawBookingListing): CandidateListing | null {
  const platformListingId = raw.id ?? bookingListingId(raw.url);
  if (!platformListingId || !raw.url || !raw.title) return null;
  const descriptionText = [raw.title, raw.description, ...(raw.amenities ?? [])].filter(Boolean).join(" ");
  const score = numeric(raw.reviewScore);
  return {
    platform: "booking",
    platformListingId,
    url: raw.url,
    title: raw.title,
    propertyType: raw.propertyType,
    bedrooms: numeric(raw.bedrooms),
    bathrooms: numeric(raw.bathrooms),
    maxGuests: numeric(raw.maxOccupancy),
    nightlyRateUsd: numeric(raw.price),
    ratingOverall: normalizeScore(raw.reviewScore),
    reviewCount: numeric(raw.reviewCount),
    isSuperhost: score !== undefined ? score >= SUPERHOST_SCORE : undefined,
    amenities: raw.amenities ?? [],
    descriptionText,
    host: { isSuperhost: score !== undefined ? score >= SUPERHOST_SCORE : undefined },
  };
}

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    url: { type: "string" },
    title: { type: "string" },
    propertyType: { type: "string" },
    bedrooms: { type: "number" },
    bathrooms: { type: "number" },
    maxOccupancy: { type: "number" },
    price: { type: "number" },
    reviewScore: { type: "number" },
    reviewCount: { type: "number" },
    amenities: { type: "array", items: { type: "string" } },
    description: { type: "string" },
  },
} as const;

export class BookingAdapter implements SourceAdapter {
  readonly source = "booking" as const;
  readonly supportsChangeDetection = true;

  constructor(private readonly fc: FirecrawlClient) {}

  async discoverListings(market: MarketConfig): Promise<CandidateListing[]> {
    const urls = await this.searchListingUrls(market);
    const out: CandidateListing[] = [];
    for (const url of urls) {
      try {
        const raw = await this.fc.post<{ data: RawBookingListing }>("/v1/extract", { urls: [url], schema: LISTING_SCHEMA });
        const parsed = parseBookingListing({ ...raw.data, url });
        if (parsed) out.push(parsed);
      } catch {
        /* graceful per-listing failure */
      }
    }
    return out;
  }

  async fetchReviews(listing: CandidateListing): Promise<RawReview[]> {
    const raw = await this.fc.post<{ data: { reviews?: RawSourceReview[] } }>("/v1/extract", {
      urls: [`${listing.url}#tab-reviews`],
      schema: REVIEW_LIST_SCHEMA,
    });
    return parseReviews(raw.data.reviews ?? [], "booking");
  }

  private async searchListingUrls(market: MarketConfig): Promise<string[]> {
    const urls = new Set<string>();
    for (const term of market.search_terms.length ? market.search_terms : [market.name]) {
      const res = await this.fc.post<{ data?: { url?: string }[] }>("/v1/search", { query: `${term} booking.com`, limit: 20 });
      for (const item of res.data ?? []) {
        if (item.url && /booking\.com\/hotel\//.test(item.url)) urls.add(item.url);
      }
    }
    return [...urls];
  }
}
