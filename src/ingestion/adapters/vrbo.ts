import type { FirecrawlClient } from "../../lib/firecrawl/client";
import type { CandidateListing, RawReview, SourceAdapter, MarketConfig } from "../types";
import { toIsoDate, numeric, extractIdFromUrl, parseReviews, REVIEW_LIST_SCHEMA, type RawSourceReview } from "./shared";

/**
 * Vrbo source adapter. Same shape as Airbnb (listings + reviews); the superhost
 * equivalent is Vrbo's "Premier Host" badge. Parsers are pure and fixture-tested.
 */

export interface RawVrboListing {
  id?: string;
  url?: string;
  title?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sleeps?: number;
  averageRate?: number;
  rating?: number;
  reviewCount?: number;
  isPremierHost?: boolean;
  amenities?: string[];
  description?: string;
  hostName?: string;
  hostId?: string;
}

const ID_RE = /\/(?:p)?(\d{6,})/;

export function vrboListingId(url?: string): string | undefined {
  return extractIdFromUrl(url, ID_RE);
}

export function parseVrboListing(raw: RawVrboListing): CandidateListing | null {
  const platformListingId = raw.id ?? vrboListingId(raw.url);
  if (!platformListingId || !raw.url || !raw.title) return null;
  const descriptionText = [raw.title, raw.description, ...(raw.amenities ?? [])].filter(Boolean).join(" ");
  return {
    platform: "vrbo",
    platformListingId,
    url: raw.url,
    title: raw.title,
    propertyType: raw.propertyType,
    bedrooms: numeric(raw.bedrooms),
    bathrooms: numeric(raw.bathrooms),
    maxGuests: numeric(raw.sleeps),
    nightlyRateUsd: numeric(raw.averageRate),
    ratingOverall: numeric(raw.rating),
    reviewCount: numeric(raw.reviewCount),
    isSuperhost: raw.isPremierHost, // Premier Host == superhost equivalent
    amenities: raw.amenities ?? [],
    descriptionText,
    host: { platformHostId: raw.hostId, displayName: raw.hostName, isSuperhost: raw.isPremierHost },
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
    sleeps: { type: "number" },
    averageRate: { type: "number" },
    rating: { type: "number" },
    reviewCount: { type: "number" },
    isPremierHost: { type: "boolean" },
    amenities: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    hostName: { type: "string" },
    hostId: { type: "string" },
  },
} as const;

export class VrboAdapter implements SourceAdapter {
  readonly source = "vrbo" as const;
  readonly supportsChangeDetection = true;

  constructor(private readonly fc: FirecrawlClient) {}

  async discoverListings(market: MarketConfig): Promise<CandidateListing[]> {
    const urls = await this.searchListingUrls(market);
    const out: CandidateListing[] = [];
    for (const url of urls) {
      try {
        const raw = await this.fc.post<{ data: RawVrboListing }>("/v1/extract", { urls: [url], schema: LISTING_SCHEMA });
        const parsed = parseVrboListing({ ...raw.data, url });
        if (parsed) out.push(parsed);
      } catch {
        /* graceful per-listing failure */
      }
    }
    return out;
  }

  async fetchReviews(listing: CandidateListing): Promise<RawReview[]> {
    const raw = await this.fc.post<{ data: { reviews?: RawSourceReview[] } }>("/v1/extract", {
      urls: [`${listing.url}#reviews`],
      schema: REVIEW_LIST_SCHEMA,
    });
    return parseReviews(raw.data.reviews ?? [], "vrbo");
  }

  private async searchListingUrls(market: MarketConfig): Promise<string[]> {
    const urls = new Set<string>();
    for (const term of market.search_terms.length ? market.search_terms : [market.name]) {
      const res = await this.fc.post<{ data?: { url?: string }[] }>("/v1/search", { query: `${term} vrbo`, limit: 20 });
      for (const item of res.data ?? []) {
        if (item.url && /vrbo\.[a-z.]+\/(?:[a-z-]+\/)?p?\d{6,}/.test(item.url)) urls.add(item.url);
      }
    }
    return [...urls];
  }
}

export { toIsoDate };
