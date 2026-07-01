import { describe, it, expect } from "vitest";
import { reviewContentHash, normalizeForHash } from "../src/lib/hash";

describe("dedup hashing", () => {
  const base = {
    source: "airbnb",
    author_name: "Sarah",
    review_date: "2024-08-14",
    body: "Beautiful home and the dock was perfect.",
  };

  it("is stable across cosmetic differences (whitespace, case, curly quotes)", () => {
    const a = reviewContentHash(base);
    const b = reviewContentHash({
      ...base,
      author_name: "  sarah ",
      body: "Beautiful   home and the DOCK was perfect.",
    });
    const c = reviewContentHash({
      ...base,
      body: "Beautiful home and the dock was perfect.".replace("perfect.", "perfect."),
    });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("changes when the review body genuinely differs", () => {
    const a = reviewContentHash(base);
    const d = reviewContentHash({ ...base, body: "Terrible stay, would not return." });
    expect(d).not.toBe(a);
  });

  it("changes when the author or date differs", () => {
    const a = reviewContentHash(base);
    expect(reviewContentHash({ ...base, author_name: "Mike" })).not.toBe(a);
    expect(reviewContentHash({ ...base, review_date: "2024-08-15" })).not.toBe(a);
  });

  it("normalizes curly quotes to straight", () => {
    expect(normalizeForHash("it’s great")).toBe("it's great");
  });
});
