import type { PeriodMetric, TrendPoint } from "./types";

/**
 * Trend engine: diff current-period metrics against the previous period.
 * Emerging/declining amenities, complaint trends, persona shifts — all fall out
 * of comparing PeriodMetric values by key. `flatThreshold` is the relative delta
 * below which a change is treated as noise. Sample size travels with every point
 * so the dashboard can de-emphasize low-confidence movements (docs/11).
 */

export interface TrendOptions {
  grain?: "month" | "season" | "year";
  flatThreshold?: number; // relative delta treated as "flat" (default 0.05)
}

export function computeTrends(
  current: PeriodMetric[],
  previous: PeriodMetric[],
  options: TrendOptions = {},
): TrendPoint[] {
  const grain = options.grain ?? "month";
  const flatThreshold = options.flatThreshold ?? 0.05;
  const prevByKey = new Map<string, PeriodMetric>();
  for (const p of previous) prevByKey.set(keyOf(p), p);

  return current.map((cur) => {
    const prev = prevByKey.get(keyOf(cur));
    const prevValue = prev ? prev.value : null;
    const delta = prevValue === null ? null : round(cur.value - prevValue);
    const deltaPct =
      prevValue === null || prevValue === 0 ? null : round((cur.value - prevValue) / Math.abs(prevValue));

    let direction: TrendPoint["direction"];
    if (prevValue === null) direction = "new";
    else if (deltaPct !== null && Math.abs(deltaPct) < flatThreshold) direction = "flat";
    else direction = cur.value > prevValue ? "up" : "down";

    return {
      marketId: cur.marketId,
      metricKey: cur.metricKey,
      entityType: cur.entityType,
      entityId: cur.entityId,
      periodStart: cur.periodStart,
      periodGrain: grain,
      value: round(cur.value),
      prevValue: prevValue === null ? null : round(prevValue),
      delta,
      deltaPct,
      direction,
      sampleSize: cur.sampleSize,
    };
  });
}

/** Index a trend point set by metricKey+market for lookup by the rec engine. */
export function trendsByKey(points: TrendPoint[]): Map<string, TrendPoint> {
  const m = new Map<string, TrendPoint>();
  for (const p of points) m.set(`${p.marketId}:${p.metricKey}`, p);
  return m;
}

function keyOf(m: PeriodMetric): string {
  return `${m.marketId}:${m.metricKey}`;
}

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
