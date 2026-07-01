import type { PlatformSource } from "../config/schema";
import type { QualifiedListing } from "../../ingestion/types";

/**
 * The write surface the ingestion pipeline depends on. Keeping it an interface
 * lets the pipeline be tested with an in-memory fake (proving dedup + filtering
 * end-to-end) while production uses the Supabase-backed implementation.
 */

export type CrawlStatus = "running" | "succeeded" | "partial" | "failed";

export interface CrawlRunCounts {
  pagesFetched: number;
  reviewsFound: number;
  reviewsNew: number;
}

export interface SnapshotInput {
  snapshotMonth: string; // YYYY-MM-01
  nightlyRateUsd?: number;
  ratingOverall?: number;
  reviewCount?: number;
  newReviews?: number;
}

export interface ReviewInput {
  marketId: string;
  listingId: string | null;
  hostId: string | null;
  source: PlatformSource;
  sourceReviewId?: string;
  contentHash: string;
  authorName?: string;
  reviewDate?: string;
  rating?: number;
  language?: string;
  body: string;
}

export interface IngestRepository {
  upsertMarketFromConfig(input: {
    slug: string;
    name: string;
    region: string;
    centerLat?: number;
    centerLng?: number;
    searchTerms: string[];
  }): Promise<string>;

  getMarketIdBySlug(slug: string): Promise<string | null>;

  startCrawlRun(input: { marketId: string; source: PlatformSource }): Promise<string>;
  finishCrawlRun(
    runId: string,
    input: { status: CrawlStatus; counts: CrawlRunCounts; error?: string },
  ): Promise<void>;

  upsertHost(input: {
    source: PlatformSource;
    platformHostId?: string;
    displayName?: string;
    isSuperhost?: boolean;
  }): Promise<string | null>;

  upsertListing(input: {
    marketId: string;
    hostId: string | null;
    listing: QualifiedListing;
  }): Promise<string>;

  upsertSnapshot(input: {
    marketId: string;
    listingId: string;
    snapshot: SnapshotInput;
  }): Promise<void>;

  /** Insert a review if new; returns true if inserted, false if a duplicate. */
  insertReviewIfNew(review: ReviewInput): Promise<boolean>;
}

/* --- In-memory implementation (tests / dry runs) ------------------------- */

export class InMemoryRepository implements IngestRepository {
  markets = new Map<string, { id: string; name: string }>(); // slug -> record
  hosts = new Map<string, string>();
  listings = new Map<string, { id: string; marketId: string }>(); // platform:id -> record
  reviews = new Set<string>(); // `${source}:${contentHash}`
  snapshots: SnapshotInput[] = [];
  crawlRuns = new Map<string, { status: CrawlStatus; counts?: CrawlRunCounts }>();
  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  async upsertMarketFromConfig(input: {
    slug: string;
    name: string;
  }): Promise<string> {
    const existing = this.markets.get(input.slug);
    if (existing) return existing.id;
    const id = this.id("mkt");
    this.markets.set(input.slug, { id, name: input.name });
    return id;
  }

  async getMarketIdBySlug(slug: string): Promise<string | null> {
    return this.markets.get(slug)?.id ?? null;
  }

  async startCrawlRun(): Promise<string> {
    const id = this.id("run");
    this.crawlRuns.set(id, { status: "running" });
    return id;
  }

  async finishCrawlRun(
    runId: string,
    input: { status: CrawlStatus; counts: CrawlRunCounts },
  ): Promise<void> {
    this.crawlRuns.set(runId, { status: input.status, counts: input.counts });
  }

  async upsertHost(input: {
    source: PlatformSource;
    platformHostId?: string;
  }): Promise<string | null> {
    if (!input.platformHostId) return null;
    const key = `${input.source}:${input.platformHostId}`;
    let id = this.hosts.get(key);
    if (!id) {
      id = this.id("host");
      this.hosts.set(key, id);
    }
    return id;
  }

  async upsertListing(input: {
    marketId: string;
    hostId: string | null;
    listing: QualifiedListing;
  }): Promise<string> {
    const key = `${input.listing.platform}:${input.listing.platformListingId}`;
    let rec = this.listings.get(key);
    if (!rec) {
      rec = { id: this.id("lst"), marketId: input.marketId };
      this.listings.set(key, rec);
    }
    return rec.id;
  }

  async upsertSnapshot(input: { snapshot: SnapshotInput }): Promise<void> {
    this.snapshots.push(input.snapshot);
  }

  async insertReviewIfNew(review: ReviewInput): Promise<boolean> {
    const key = `${review.source}:${review.contentHash}`;
    if (this.reviews.has(key)) return false;
    this.reviews.add(key);
    return true;
  }
}
