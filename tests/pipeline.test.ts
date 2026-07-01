import { describe, it, expect } from "vitest";
import { runIngestion } from "../src/ingestion/pipeline";
import { InMemoryRepository } from "../src/lib/db/repository";
import { discoveryProfileSchema, marketSchema } from "../src/lib/config/schema";
import type { SourceAdapter, CandidateListing, RawReview } from "../src/ingestion/types";

const market = marketSchema.parse({
  slug: "squam-lake",
  name: "Squam Lake",
  search_terms: ["Squam Lake vacation rental"],
});

const profile = discoveryProfileSchema.parse({
  match_mode: "most",
  required: { entire_home: true },
  preferred: { luxury: true, family_oriented: true, pet_friendly: true, superhost: true },
  preferred_threshold: 0.5,
  heuristics: {
    luxury: { min_nightly_rate_usd: 400, keywords: ["luxury"] },
    family_oriented: { min_bedrooms: 3, keywords: ["family"] },
    pet_friendly: { amenity_flags: ["dog"] },
    superhost: { require_badge: true },
  },
});

const qualifying: CandidateListing = {
  platform: "airbnb",
  platformListingId: "1",
  url: "https://airbnb.com/rooms/1",
  title: "Luxury family lakefront",
  propertyType: "Entire home",
  bedrooms: 4,
  nightlyRateUsd: 800,
  isSuperhost: true,
  amenities: ["Dog friendly"],
  descriptionText: "luxury family dog",
  host: { platformHostId: "h1", displayName: "Dana", isSuperhost: true },
};

const nonQualifying: CandidateListing = {
  platform: "airbnb",
  platformListingId: "2",
  url: "https://airbnb.com/rooms/2",
  title: "Basic room",
  propertyType: "Private room",
  bedrooms: 1,
  nightlyRateUsd: 90,
  amenities: [],
  descriptionText: "basic",
};

const reviews: RawReview[] = [
  { source: "airbnb", authorName: "A", reviewDate: "2024-06-01", body: "Loved the dock." },
  { source: "airbnb", authorName: "B", reviewDate: "2024-07-01", body: "Great host, spotless." },
];

class FakeAdapter implements SourceAdapter {
  readonly source = "airbnb" as const;
  readonly supportsChangeDetection = true;
  constructor(private readonly opts: { failListing?: string } = {}) {}
  async discoverListings(): Promise<CandidateListing[]> {
    return [qualifying, nonQualifying];
  }
  async fetchReviews(listing: CandidateListing): Promise<RawReview[]> {
    if (this.opts.failListing === listing.platformListingId) {
      throw new Error("simulated review fetch failure");
    }
    return reviews;
  }
}

describe("ingestion pipeline", () => {
  it("filters, ingests, and deduplicates on re-run", async () => {
    const repo = new InMemoryRepository();
    const marketId = await repo.upsertMarketFromConfig({ slug: market.slug, name: market.name });

    const first = await runIngestion({
      marketId,
      market,
      adapter: new FakeAdapter(),
      repo,
      profile,
      historyWindowMonths: 12,
    });

    expect(first.status).toBe("succeeded");
    expect(first.reviewsFound).toBe(2); // only the qualifying listing's reviews
    expect(first.reviewsNew).toBe(2);
    expect(repo.listings.size).toBe(1); // non-qualifying listing was filtered out
    expect(repo.reviews.size).toBe(2);

    // Re-run: same content -> nothing new (dedup by content hash).
    const second = await runIngestion({
      marketId,
      market,
      adapter: new FakeAdapter(),
      repo,
      profile,
      historyWindowMonths: 12,
    });
    expect(second.reviewsFound).toBe(2);
    expect(second.reviewsNew).toBe(0);
    expect(repo.reviews.size).toBe(2);
  });

  it("degrades to 'partial' when a listing fails, without losing the run", async () => {
    const repo = new InMemoryRepository();
    const marketId = await repo.upsertMarketFromConfig({ slug: market.slug, name: market.name });
    const result = await runIngestion({
      marketId,
      market,
      adapter: new FakeAdapter({ failListing: "1" }),
      repo,
      profile,
      historyWindowMonths: 12,
    });
    expect(result.status).toBe("partial");
    expect(result.reviewsNew).toBe(0); // the only qualifying listing failed
  });
});
