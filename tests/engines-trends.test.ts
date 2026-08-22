import { describe, it, expect } from "vitest";
import { computeTrends, trendsByKey } from "../src/engines/trends";
import type { PeriodMetric } from "../src/engines/types";

function metric(key: string, value: number, sample = 20): PeriodMetric {
  return { metricKey: key, entityType: "amenity", marketId: "m1", periodStart: "2026-06-01", value, sampleSize: sample };
}

describe("trend engine", () => {
  it("computes delta, deltaPct, and direction=up for a rising metric", () => {
    const [t] = computeTrends([metric("amenity.fire_pit.mention_rate", 0.2)], [metric("amenity.fire_pit.mention_rate", 0.1)]);
    expect(t!.delta).toBeCloseTo(0.1, 5);
    expect(t!.deltaPct).toBeCloseTo(1.0, 5);
    expect(t!.direction).toBe("up");
    expect(t!.sampleSize).toBe(20);
  });

  it("marks a metric with no prior period as 'new'", () => {
    const [t] = computeTrends([metric("amenity.hot_tub.mention_rate", 0.15)], []);
    expect(t!.direction).toBe("new");
    expect(t!.prevValue).toBeNull();
    expect(t!.delta).toBeNull();
  });

  it("treats sub-threshold change as 'flat'", () => {
    const [t] = computeTrends(
      [metric("category.cleanliness.negative_rate", 0.102)],
      [metric("category.cleanliness.negative_rate", 0.1)],
      { flatThreshold: 0.05 },
    );
    expect(t!.direction).toBe("flat");
  });

  it("detects a declining metric", () => {
    const [t] = computeTrends([metric("ops.wifi_down.rate", 0.05)], [metric("ops.wifi_down.rate", 0.2)]);
    expect(t!.direction).toBe("down");
  });

  it("indexes points by market+metric for lookup", () => {
    const points = computeTrends([metric("amenity.fire_pit.mention_rate", 0.2)], []);
    const map = trendsByKey(points);
    expect(map.get("m1:amenity.fire_pit.mention_rate")?.direction).toBe("new");
  });
});
