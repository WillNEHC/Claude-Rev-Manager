import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IngestRepository,
  CrawlRunCounts,
  CrawlStatus,
  SnapshotInput,
  ReviewInput,
} from "./repository";
import type { PlatformSource } from "../config/schema";
import type { QualifiedListing } from "../../ingestion/types";

/**
 * Supabase-backed IngestRepository. Maps the pipeline's write operations onto
 * the normalized schema (supabase/migrations). Reviews are inserted with
 * ignoreDuplicates (ON CONFLICT (source, content_hash) DO NOTHING); the returned
 * row set tells us whether the row was newly inserted or a duplicate.
 *
 * Not exercised by the unit suite (requires a live project); integration tests
 * against a Supabase branch run it in Phase 3.
 */
export class SupabaseRepository implements IngestRepository {
  constructor(private readonly db: SupabaseClient) {}

  async upsertMarketFromConfig(input: {
    slug: string;
    name: string;
    region: string;
    centerLat?: number;
    centerLng?: number;
    searchTerms: string[];
  }): Promise<string> {
    const { data, error } = await this.db
      .from("markets")
      .upsert(
        {
          slug: input.slug,
          name: input.name,
          region: input.region,
          center_lat: input.centerLat,
          center_lng: input.centerLng,
          search_terms: input.searchTerms,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async getMarketIdBySlug(slug: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("markets")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data?.id as string) ?? null;
  }

  async startCrawlRun(input: { marketId: string; source: PlatformSource }): Promise<string> {
    const { data, error } = await this.db
      .from("crawl_runs")
      .insert({ market_id: input.marketId, source: input.source, status: "running" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async finishCrawlRun(
    runId: string,
    input: { status: CrawlStatus; counts: CrawlRunCounts; error?: string },
  ): Promise<void> {
    const { error } = await this.db
      .from("crawl_runs")
      .update({
        status: input.status,
        finished_at: new Date().toISOString(),
        pages_fetched: input.counts.pagesFetched,
        reviews_found: input.counts.reviewsFound,
        reviews_new: input.counts.reviewsNew,
        error: input.error ?? null,
      })
      .eq("id", runId);
    if (error) throw error;
  }

  async upsertHost(input: {
    source: PlatformSource;
    platformHostId?: string;
    displayName?: string;
    isSuperhost?: boolean;
  }): Promise<string | null> {
    if (!input.platformHostId) return null;
    const { data, error } = await this.db
      .from("hosts")
      .upsert(
        {
          platform: input.source,
          platform_host_id: input.platformHostId,
          display_name: input.displayName,
          is_superhost: input.isSuperhost,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "platform,platform_host_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async upsertListing(input: {
    marketId: string;
    hostId: string | null;
    listing: QualifiedListing;
  }): Promise<string> {
    const l = input.listing;
    const { data, error } = await this.db
      .from("listings")
      .upsert(
        {
          market_id: input.marketId,
          host_id: input.hostId,
          platform: l.platform,
          platform_listing_id: l.platformListingId,
          url: l.url,
          title: l.title,
          property_type: "entire_home",
          is_entire_home: l.flags.isEntireHome,
          is_luxury: l.flags.isLuxury,
          is_family_oriented: l.flags.isFamilyOriented,
          is_pet_friendly: l.flags.isPetFriendly,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          max_guests: l.maxGuests,
          nightly_rate_usd: l.nightlyRateUsd,
          rating_overall: l.ratingOverall,
          review_count: l.reviewCount,
          lat: l.lat,
          lng: l.lng,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "platform,platform_listing_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async upsertSnapshot(input: {
    marketId: string;
    listingId: string;
    snapshot: SnapshotInput;
  }): Promise<void> {
    const { error } = await this.db.from("monthly_snapshots").upsert(
      {
        snapshot_month: input.snapshot.snapshotMonth,
        market_id: input.marketId,
        listing_id: input.listingId,
        nightly_rate_usd: input.snapshot.nightlyRateUsd,
        rating_overall: input.snapshot.ratingOverall,
        review_count: input.snapshot.reviewCount,
        new_reviews: input.snapshot.newReviews,
      },
      { onConflict: "snapshot_month,market_id,listing_id" },
    );
    if (error) throw error;
  }

  async insertReviewIfNew(review: ReviewInput): Promise<boolean> {
    const { data, error } = await this.db
      .from("reviews")
      .upsert(
        {
          listing_id: review.listingId,
          market_id: review.marketId,
          host_id: review.hostId,
          source: review.source,
          source_review_id: review.sourceReviewId,
          content_hash: review.contentHash,
          author_name: review.authorName,
          review_date: review.reviewDate,
          rating: review.rating,
          language: review.language ?? "en",
          body: review.body,
        },
        { onConflict: "source,content_hash", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    return (data?.length ?? 0) > 0; // rows returned only when actually inserted
  }
}
