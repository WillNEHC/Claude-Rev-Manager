import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseListing,
  parseReviews,
  toIsoDate,
  extractIdFromUrl,
  type RawAirbnbListing,
  type RawAirbnbReview,
} from "../src/ingestion/adapters/airbnb";

const listingFixture: RawAirbnbListing = JSON.parse(
  readFileSync("tests/fixtures/airbnb/listing.json", "utf8"),
);
const reviewsFixture: RawAirbnbReview[] = JSON.parse(
  readFileSync("tests/fixtures/airbnb/reviews.json", "utf8"),
);

describe("airbnb listing parsing", () => {
  it("maps a raw listing to a CandidateListing", () => {
    const parsed = parseListing(listingFixture);
    expect(parsed).not.toBeNull();
    expect(parsed!.platform).toBe("airbnb");
    expect(parsed!.platformListingId).toBe("1234567");
    expect(parsed!.bedrooms).toBe(4);
    expect(parsed!.nightlyRateUsd).toBe(750);
    expect((parsed!.descriptionText ?? "").toLowerCase()).toContain("dock");
  });

  it("returns null for an unusable listing (no id/url/title)", () => {
    expect(parseListing({ title: "no id or url" })).toBeNull();
  });

  it("recovers the listing id from the URL when id is absent", () => {
    const parsed = parseListing({
      url: "https://www.airbnb.com/rooms/9988776",
      title: "Cabin",
    });
    expect(parsed!.platformListingId).toBe("9988776");
  });
});

describe("airbnb review parsing", () => {
  it("parses reviews and drops empty ones", () => {
    const parsed = parseReviews(reviewsFixture);
    expect(parsed).toHaveLength(2); // the whitespace-only review is dropped
    expect(parsed[0]!.body).toContain("dock");
    expect(parsed[1]!.authorName).toBe("Mike"); // trimmed
  });

  it("normalizes dates", () => {
    expect(toIsoDate("2024-08-14")).toBe("2024-08-14");
    expect(toIsoDate("March 2024")).toBe("2024-03-01");
    expect(toIsoDate("not a date")).toBeUndefined();
    expect(toIsoDate(undefined)).toBeUndefined();
  });

  it("extracts ids from various room URL shapes", () => {
    expect(extractIdFromUrl("https://www.airbnb.com/rooms/plus/42")).toBe("42");
    expect(extractIdFromUrl("https://airbnb.com/rooms/7?x=1")).toBe("7");
    expect(extractIdFromUrl("https://example.com/nope")).toBeUndefined();
  });
});
