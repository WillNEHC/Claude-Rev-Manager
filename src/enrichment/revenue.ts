/**
 * Revenue-data enrichment (docs/06, docs/15 O4). Attaches market rate/occupancy
 * context to monthly snapshots and, later, ROI models. Behind an interface so
 * the pipeline is provider-agnostic and testable without a live PriceLabs key.
 *
 * NOTE: the PriceLabs response mapping below is defensive and should be verified
 * against the live API schema before production use (enrichment-only in V1).
 */

export interface RevenueEnrichment {
  occupancyPct?: number; // 0..100
  marketAdrUsd?: number; // average daily rate
  revparUsd?: number; // revenue per available night
  source: string;
}

export interface RevenueEnrichmentProvider {
  readonly source: string;
  forMarket(input: { marketSlug: string; lat?: number; lng?: number }): Promise<RevenueEnrichment | null>;
}

/** Map a RevenueEnrichment into the snapshot's occupancy + metrics jsonb. */
export function toSnapshotMetrics(e: RevenueEnrichment): {
  occupancyPct?: number;
  metrics: Record<string, unknown>;
} {
  return {
    occupancyPct: e.occupancyPct,
    metrics: {
      revenue: { adr_usd: e.marketAdrUsd, revpar_usd: e.revparUsd, source: e.source },
    },
  };
}

export interface PriceLabsOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Maps a market slug to the PriceLabs geo identifier (zip/region). */
  geoForMarket: (slug: string) => string | undefined;
}

/** PriceLabs neighborhood-data provider. */
export class PriceLabsProvider implements RevenueEnrichmentProvider {
  readonly source = "pricelabs";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly geoForMarket: (slug: string) => string | undefined;

  constructor(opts: PriceLabsOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.pricelabs.co").replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.geoForMarket = opts.geoForMarket;
  }

  async forMarket(input: { marketSlug: string }): Promise<RevenueEnrichment | null> {
    const geo = this.geoForMarket(input.marketSlug);
    if (!geo) return null;
    const res = await this.fetchImpl(`${this.baseUrl}/v1/neighborhood_data?geo=${encodeURIComponent(geo)}`, {
      headers: { "X-API-Key": this.apiKey },
    });
    if (!res.ok) throw new Error(`pricelabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return mapPriceLabs(await res.json());
  }
}

/** Defensive mapping of a PriceLabs neighborhood payload → RevenueEnrichment. */
export function mapPriceLabs(payload: unknown): RevenueEnrichment {
  const p = (payload ?? {}) as Record<string, unknown>;
  const data = (p.data ?? p) as Record<string, unknown>;
  const num = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    occupancyPct: num(data.occupancy ?? data.occupancy_pct),
    marketAdrUsd: num(data.adr ?? data.average_daily_rate),
    revparUsd: num(data.revpar),
    source: "pricelabs",
  };
}
