import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { loadMarkets, loadDiscoveryFilters, resolveProfile } from "../src/lib/config/load";
import { marketsFileSchema } from "../src/lib/config/schema";

describe("config loading", () => {
  it("loads and validates the example markets config", () => {
    const cfg = loadMarkets("config/markets.example.yaml");
    const slugs = cfg.markets.map((m) => m.slug);
    expect(slugs).toContain("squam-lake");
    expect(slugs).toContain("lake-winnipesaukee");
    expect(cfg.defaults.history_window_months).toBeGreaterThan(0);
  });

  it("loads the example discovery filters and resolves the default profile", () => {
    const filters = loadDiscoveryFilters("config/discovery-filters.example.yaml");
    const profile = resolveProfile(filters, "default");
    expect(profile.required.entire_home).toBe(true);
    expect(["all", "most", "any"]).toContain(profile.match_mode);
  });

  it("rejects an invalid market slug", () => {
    const bad = parseYaml(`
markets:
  - slug: "Not Kebab Case"
    name: Bad
`);
    const result = marketsFileSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("requires at least one market", () => {
    const result = marketsFileSchema.safeParse({ markets: [] });
    expect(result.success).toBe(false);
  });
});
