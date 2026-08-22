import type { PlatformSource, MarketConfig, DiscoveryProfile } from "../lib/config/schema";

/**
 * Domain types shared across ingestion. Adapters normalize each source into
 * these shapes so the pipeline is source-agnostic (see docs/02-architecture.md,
 * the SourceAdapter contract).
 */

/** Raw attributes as scraped from a listing, before discovery filtering. */
export interface CandidateListing {
  platform: PlatformSource;
  platformListingId: string;
  url: string;
  title: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  nightlyRateUsd?: number;
  ratingOverall?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
  isSuperhost?: boolean;
  amenities?: string[];
  /** Free text used by keyword heuristics (title + description + amenities). */
  descriptionText?: string;
  host?: {
    platformHostId?: string;
    displayName?: string;
    isSuperhost?: boolean;
  };
}

/** A listing that passed discovery filtering, with derived criterion flags. */
export interface QualifiedListing extends CandidateListing {
  flags: DiscoveryFlags;
}

export interface DiscoveryFlags {
  isEntireHome: boolean;
  isLuxury: boolean;
  isFamilyOriented: boolean;
  isPetFriendly: boolean;
  isSuperhost: boolean;
}

/** A single review as normalized from a source, pre-hash. */
export interface RawReview {
  source: PlatformSource;
  sourceReviewId?: string;
  authorName?: string;
  reviewDate?: string; // ISO YYYY-MM-DD
  rating?: number;
  language?: string;
  body: string;
}

/** A source that can discover listings and fetch their reviews. */
export interface SourceAdapter {
  readonly source: PlatformSource;
  readonly supportsChangeDetection: boolean;
  discoverListings(market: MarketConfig): Promise<CandidateListing[]>;
  fetchReviews(listing: CandidateListing, since?: Date): Promise<RawReview[]>;
}

export type { PlatformSource, MarketConfig, DiscoveryProfile };
