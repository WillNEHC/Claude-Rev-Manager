import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FirecrawlClient, type Fetcher } from "../src/lib/firecrawl/client";
import { AirbnbAdapter } from "../src/ingestion/adapters/airbnb";
import { runIngestion } from "../src/ingestion/pipeline";
import { InMemoryRepository } from "../src/lib/db/repository";
import { discoveryProfileSchema, marketSchema } from "../src/lib/config/schema";

/**
 * Integration test: exercises the REAL AirbnbAdapter + FirecrawlClient + pipeline
 * together (the unit pipeline test uses a fake adapter). The only fake is the
 * HTTP transport, which serves fixture data — so the search -> extract -> parse
 * -> filter -> dedup chain is validated end to end without network or scraping.
 */

const rawListing = JSON.parse(readFileSync("tests/fixtures/airbnb/listing.json", "utf8"));
const rawReviews = JSON.parse(readFileSync("tests/fixtures/airbnb/reviews.json", "utf8"));
const listingUrl = rawListing.url as string;

/** Fake Firecrawl transport routing by endpoint + payload. */
const fixtureFetcher: Fetcher = async (req) => {
  const payload = JSON.parse(req.body ?? "{}") as { urls?: string[]; query?: string };
  if (req.url.endsWith("/v1/search")) {
    return ok({ data: [{ url: listingUrl }] });
  }
  if (req.url.endsWith("/v1/extract")) {
    const target = payload.urls?.[0] ?? "";
    if (target.endsWith("/reviews")) return ok({ data: { reviews: rawReviews } });
    return ok({ data: rawListing });
  }
  return { status: 404, body: "not found" };
};

function ok(json: unknown) {
  return { status: 200, body: JSON.stringify(json) };
}

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
    luxury: { min_nightly_rate_usd: 400, keywords: ["luxury", "estate"] },
    family_oriented: { min_bedrooms: 3, keywords: ["family"] },
    pet_friendly: { amenity_flags: ["dog"] },
    superhost: { require_badge: true },
  },
});

describe("integration: real Airbnb adapter through the pipeline", () => {
  it("discovers, extracts, filters, and dedups a real listing via fixtures", async () => {
    const fc = new FirecrawlClient({ apiKey: "test", fetcher: fixtureFetcher, sleep: async () => {} });
    const adapter = new AirbnbAdapter(fc);
    const repo = new InMemoryRepository();
    const marketId = await repo.upsertMarketFromConfig({ slug: market.slug, name: market.name });

    const first = await runIngestion({
      marketId,
      market,
      adapter,
      repo,
      profile,
      historyWindowMonths: 12,
    });

    // The fixture listing qualifies (luxury + family + pet + superhost).
    expect(first.status).toBe("succeeded");
    expect(repo.listings.size).toBe(1);
    // Two usable reviews (the whitespace-only one is dropped by the parser).
    expect(first.reviewsFound).toBe(2);
    expect(first.reviewsNew).toBe(2);
    expect(repo.reviews.size).toBe(2);
    // A host was resolved from the extracted hostId.
    expect(repo.hosts.size).toBe(1);

    // Re-run: dedup means nothing new lands.
    const second = await runIngestion({
      marketId,
      market,
      adapter: new AirbnbAdapter(fc),
      repo,
      profile,
      historyWindowMonths: 12,
    });
    expect(second.reviewsNew).toBe(0);
    expect(repo.reviews.size).toBe(2);
  });
});
