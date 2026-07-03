import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseVrboListing, vrboListingId, type RawVrboListing } from "../src/ingestion/adapters/vrbo";
import { parseBookingListing, bookingListingId, normalizeScore, type RawBookingListing } from "../src/ingestion/adapters/booking";
import { parseReviews } from "../src/ingestion/adapters/shared";
import { reviewContentHash } from "../src/lib/hash";

const vrboFixture: RawVrboListing = JSON.parse(readFileSync("tests/fixtures/vrbo/listing.json", "utf8"));
const bookingFixture: RawBookingListing = JSON.parse(readFileSync("tests/fixtures/booking/listing.json", "utf8"));

describe("vrbo adapter", () => {
  it("parses a listing and maps Premier Host -> superhost", () => {
    const l = parseVrboListing(vrboFixture)!;
    expect(l.platform).toBe("vrbo");
    expect(l.platformListingId).toBe("1234567");
    expect(l.maxGuests).toBe(6);
    expect(l.isSuperhost).toBe(true);
    expect(l.nightlyRateUsd).toBe(520);
  });

  it("extracts the listing id from various Vrbo URL shapes", () => {
    expect(vrboListingId("https://www.vrbo.com/en-us/cabin-rental/p9988776")).toBe("9988776");
    expect(vrboListingId("https://vrbo.com/1234567")).toBe("1234567");
    expect(vrboListingId("https://vrbo.com/no-id-here")).toBeUndefined();
  });

  it("returns null for an unusable listing", () => {
    expect(parseVrboListing({ title: "no url or id" })).toBeNull();
  });
});

describe("booking adapter", () => {
  it("normalizes the 0-10 score to 0-5 and derives the superhost equivalent", () => {
    expect(normalizeScore(9.4)).toBe(4.7);
    const l = parseBookingListing(bookingFixture)!;
    expect(l.platform).toBe("booking");
    expect(l.ratingOverall).toBe(4.7);
    expect(l.isSuperhost).toBe(true); // 9.4 >= 9.0
    expect(l.maxGuests).toBe(8);
  });

  it("treats a mediocre score as not-superhost-equivalent", () => {
    const l = parseBookingListing({ ...bookingFixture, reviewScore: 7.5 })!;
    expect(l.isSuperhost).toBe(false);
    expect(l.ratingOverall).toBe(3.75);
  });

  it("extracts the listing id from a Booking hotel URL", () => {
    expect(bookingListingId("https://www.booking.com/hotel/us/squam-lakeside-lodge.html")).toBe("squam-lakeside-lodge");
  });
});

describe("shared review parsing + cross-source dedup", () => {
  it("parses reviews for any source and drops empties", () => {
    const reviews = parseReviews(
      [
        { id: "1", author: " Al ", date: "2024-07-01", rating: 5, text: "Loved it" },
        { id: "2", author: "x", date: "bad", rating: 4, text: "   " },
      ],
      "vrbo",
    );
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.source).toBe("vrbo");
    expect(reviews[0]!.authorName).toBe("Al");
  });

  it("keeps the same review text from different sources distinct (source is in the hash)", () => {
    const body = "Beautiful lakefront home";
    const a = reviewContentHash({ source: "airbnb", author_name: "Al", review_date: "2024-07-01", body });
    const v = reviewContentHash({ source: "vrbo", author_name: "Al", review_date: "2024-07-01", body });
    expect(a).not.toBe(v);
  });
});
