import { describe, it, expect } from "vitest";
import { classifySource, type SearchProvider, type ResearchDoc } from "../src/ingestion/research/provider";
import { gatherMarketReviews } from "../src/ingestion/research/gatherer";
import { runWebResearch } from "../src/ingestion/research/pipeline";
import { InMemoryRepository } from "../src/lib/db/repository";
import { marketSchema } from "../src/lib/config/schema";

const market = marketSchema.parse({ slug: "squam-lake", name: "Squam Lake", search_terms: [] });

/** Fake provider: same doc set for every query (so dedup-by-url is exercised). */
class FakeProvider implements SearchProvider {
  calls = 0;
  constructor(private readonly docs: ResearchDoc[]) {}
  async search(): Promise<ResearchDoc[]> {
    this.calls += 1;
    return this.docs;
  }
}

const docs: ResearchDoc[] = [
  { url: "https://www.reddit.com/r/newhampshire/comments/x", title: "Squam trip", content: "We loved the quiet dock and the loons. Wifi was spotty though. ".repeat(10) },
  { url: "https://www.tripadvisor.com/ShowTopic-forum", title: "Squam forum", content: "Families ask about pet friendly cabins and kid-safe swimming. ".repeat(10) },
  { url: "https://visitnh.gov/squam", title: "Visit NH", content: "Squam Lake offers boating, hiking, and leaf peeping in fall. ".repeat(10) },
  { url: "https://example.com/thin", title: "thin", content: "too short" },
];

describe("source classification", () => {
  it("maps domains to platform sources", () => {
    expect(classifySource("https://www.reddit.com/r/x")).toBe("reddit");
    expect(classifySource("https://www.tripadvisor.com/ShowTopic")).toBe("forum");
    expect(classifySource("https://visitnh.gov/squam")).toBe("destination_site");
    expect(classifySource("https://someblog.substack.com/p/x")).toBe("blog");
    expect(classifySource("https://randomsite.com/page")).toBe("other");
  });
});

describe("market review gathering", () => {
  it("turns public docs into classified, listing-less reviews and drops thin ones", async () => {
    const provider = new FakeProvider(docs);
    const reviews = await gatherMarketReviews(market, provider, { minContentChars: 200 });
    // 3 usable docs (the "too short" one is dropped), deduped across the 4 queries by URL.
    expect(reviews).toHaveLength(3);
    expect(reviews.map((r) => r.source).sort()).toEqual(["destination_site", "forum", "reddit"]);
    expect(reviews.every((r) => r.body.length >= 200)).toBe(true);
  });
});

describe("web research pipeline (ToS-clean ingestion)", () => {
  it("inserts market-level reviews and dedups on re-run", async () => {
    const repo = new InMemoryRepository();
    const marketId = await repo.upsertMarketFromConfig({ slug: market.slug, name: market.name });
    const provider = new FakeProvider(docs);

    const first = await runWebResearch({ marketId, market, provider, repo });
    expect(first.reviewsFound).toBe(3);
    expect(first.reviewsNew).toBe(3);
    expect(repo.reviews.size).toBe(3);

    const second = await runWebResearch({ marketId, market, provider, repo });
    expect(second.reviewsNew).toBe(0); // dedup by content hash
    expect(repo.reviews.size).toBe(3);
  });
});
