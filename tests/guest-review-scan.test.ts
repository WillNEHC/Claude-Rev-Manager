import { describe, it, expect } from "vitest";
import { scanReviews, normalizedRating, type HospitableReview } from "../src/guest/review-scan";

const rv = (id: string, p: Partial<HospitableReview>): HospitableReview => ({
  id,
  platform: "airbnb",
  property: { name: "Manchester" },
  can_respond: false,
  ...p,
});

const reviews: HospitableReview[] = [
  rv("a", { public: { rating: 5, review: "Spotless and the sauna was amazing", response: "Thanks!" } }),
  rv("b", {
    public: { rating: 4, review: "Great stay but the wifi kept dropping" },
    private: { feedback: "Bedroom was cold at night", detailed_ratings: [{ type: "cleanliness", rating: 4 }, { type: "communication", rating: 5 }] },
    can_respond: true,
    guest: { first_name: "Dana", last_name: "Smith" },
  }),
  rv("c", { platform: "booking", public: { rating: 9 }, property: { name: "Nashua" }, private: { detailed_ratings: [{ type: "cleanliness", rating: 5 }] } }),
];

describe("guest review scan", () => {
  it("normalizes Booking.com 10-point scores to 5", () => {
    expect(normalizedRating(reviews[2]!)).toBe(4.5);
    expect(normalizedRating(rv("x", { public: { rating: null } }))).toBeNull();
  });

  it("summarizes per property", () => {
    const s = scanReviews(reviews);
    const m = s.properties.find((p) => p.property === "Manchester")!;
    expect(m.reviews).toBe(2);
    expect(m.avgRating).toBe(4.5);
    expect(m.below5.map((b) => b.reviewId)).toEqual(["b"]);
    expect(m.below5[0]!.guest).toBe("Dana S.");
    expect(m.awaitingResponse.map((a) => a.reviewId)).toEqual(["b"]);
    expect(m.privateFeedback[0]!.text).toBe("Bedroom was cold at night");
    expect(m.categoryAverages).toEqual({ cleanliness: 4, communication: 5 });
  });

  it("overall averages and five-star share", () => {
    const s = scanReviews(reviews);
    expect(s.total).toBe(3);
    expect(s.avgRating).toBe(4.5); // (5 + 4 + 4.5) / 3
    expect(s.fiveStarShare).toBe(0.33);
  });

  it("finds themes only with quoted evidence, including private feedback", () => {
    const s = scanReviews(reviews);
    const wifi = s.themes.find((t) => t.theme === "wifi & TV")!;
    expect(wifi.reviews).toBe(1);
    expect(wifi.quotes[0]!.text).toContain("wifi kept dropping");
    const heat = s.themes.find((t) => t.theme === "heat / hot water / AC")!;
    expect(heat.quotes[0]!.text).toContain("cold at night");
    expect(s.themes.find((t) => t.theme === "value / price")).toBeUndefined();
  });
});
