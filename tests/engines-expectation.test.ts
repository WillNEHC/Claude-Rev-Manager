import { describe, it, expect } from "vitest";
import { classifyAmenities } from "../src/engines/expectation-index";
import type { AmenityStat } from "../src/engines/types";

function stat(slug: string, o: Partial<AmenityStat>): AmenityStat {
  return {
    marketId: "m1",
    amenitySlug: slug,
    reviewsInPeriod: 100,
    mentions: 0,
    positive: 0,
    negative: 0,
    delighterCooccur: 0,
    evidence: [{ excerpt: `re: ${slug}` }],
    ...o,
  };
}

describe("guest expectation index", () => {
  it("classifies a praised, delighter-linked amenity as delight", () => {
    const [c] = classifyAmenities([
      stat("fire_pit", { mentions: 20, positive: 16, negative: 2, delighterCooccur: 10 }),
    ]);
    expect(c!.classification).toBe("delight");
    expect(c!.confidence).toBeGreaterThan(0.5);
  });

  it("classifies a high-prevalence, complained-about amenity as table_stakes", () => {
    const [c] = classifyAmenities([
      stat("fast_wifi", { mentions: 40, positive: 4, negative: 30, delighterCooccur: 0 }),
    ]);
    expect(c!.classification).toBe("table_stakes");
  });

  it("leaves thin-evidence amenities unknown with low confidence", () => {
    const [c] = classifyAmenities([stat("paddleboards", { mentions: 3, positive: 3 })], { minSample: 5 });
    expect(c!.classification).toBe("unknown");
    expect(c!.confidence).toBeLessThan(0.3);
  });

  it("aggregates an amenity across markets before classifying", () => {
    const results = classifyAmenities([
      stat("fire_pit", { marketId: "m1", mentions: 12, positive: 10, delighterCooccur: 10 }),
      stat("fire_pit", { marketId: "m2", mentions: 10, positive: 8, delighterCooccur: 8 }),
    ]);
    expect(results).toHaveLength(1); // one classification for the amenity, not per market
    expect(results[0]!.classification).toBe("delight");
  });
});
