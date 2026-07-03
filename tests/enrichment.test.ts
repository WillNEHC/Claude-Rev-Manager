import { describe, it, expect } from "vitest";
import { mapPriceLabs, toSnapshotMetrics, PriceLabsProvider, type RevenueEnrichmentProvider, type RevenueEnrichment } from "../src/enrichment/revenue";
import { runEnrichment, type EnrichmentRepository } from "../src/enrichment/enrich";

describe("PriceLabs mapping", () => {
  it("maps a neighborhood payload defensively", () => {
    const e = mapPriceLabs({ data: { occupancy: 62.5, adr: 480, revpar: 300 } });
    expect(e.occupancyPct).toBe(62.5);
    expect(e.marketAdrUsd).toBe(480);
    expect(e.revparUsd).toBe(300);
    expect(e.source).toBe("pricelabs");
  });

  it("tolerates alternate field names and missing values", () => {
    const e = mapPriceLabs({ occupancy_pct: 55, average_daily_rate: 400 });
    expect(e.occupancyPct).toBe(55);
    expect(e.marketAdrUsd).toBe(400);
    expect(e.revparUsd).toBeUndefined();
  });

  it("maps enrichment into snapshot occupancy + metrics", () => {
    const s = toSnapshotMetrics({ occupancyPct: 60, marketAdrUsd: 500, revparUsd: 300, source: "pricelabs" });
    expect(s.occupancyPct).toBe(60);
    expect((s.metrics.revenue as Record<string, unknown>).adr_usd).toBe(500);
  });

  it("provider returns null when no geo mapping exists (skipped, not error)", async () => {
    const provider = new PriceLabsProvider({ apiKey: "k", geoForMarket: () => undefined });
    expect(await provider.forMarket({ marketSlug: "unknown" })).toBeNull();
  });
});

describe("enrichment run", () => {
  class FakeProvider implements RevenueEnrichmentProvider {
    readonly source = "fake";
    constructor(private readonly byMarket: Record<string, RevenueEnrichment | null>) {}
    async forMarket(input: { marketSlug: string }): Promise<RevenueEnrichment | null> {
      const v = this.byMarket[input.marketSlug];
      if (v === undefined) throw new Error("boom");
      return v;
    }
  }
  class FakeRepo implements EnrichmentRepository {
    snapshots: { marketId: string; occupancyPct?: number }[] = [];
    async getMarkets() {
      return [
        { id: "m1", slug: "squam-lake" },
        { id: "m2", slug: "newfound-lake" },
        { id: "m3", slug: "lake-sunapee" },
      ];
    }
    async upsertMarketSnapshot(input: { marketId: string; occupancyPct?: number }) {
      this.snapshots.push({ marketId: input.marketId, occupancyPct: input.occupancyPct });
    }
  }

  it("enriches, skips, and degrades per market", async () => {
    const provider = new FakeProvider({
      "squam-lake": { occupancyPct: 60, source: "fake" },
      "newfound-lake": null, // no data -> skipped
      // sunapee absent -> provider throws -> failed
    });
    const repo = new FakeRepo();
    const result = await runEnrichment({ repo, provider, snapshotMonth: "2026-06-01" });
    expect(result).toEqual({ enriched: 1, skipped: 1, failed: 1 });
    expect(repo.snapshots).toHaveLength(1);
    expect(repo.snapshots[0]!.occupancyPct).toBe(60);
  });
});
