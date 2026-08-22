import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichmentRepository } from "../../enrichment/enrich";

/**
 * Supabase enrichment repository. Market-level snapshots use listing_id = null;
 * because NULLs are distinct in a unique constraint, we do an explicit
 * select-then-update/insert to keep (month, market) idempotent (a partial unique
 * index in migration 0008 backs this up).
 */
export class SupabaseEnrichmentRepository implements EnrichmentRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getMarkets(): Promise<{ id: string; slug: string }[]> {
    const { data, error } = await this.db.from("markets").select("id, slug").eq("is_active", true);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { id: row.id as string, slug: row.slug as string };
    });
  }

  async upsertMarketSnapshot(input: {
    marketId: string;
    snapshotMonth: string;
    occupancyPct?: number;
    metrics: Record<string, unknown>;
  }): Promise<void> {
    const { data: existing } = await this.db
      .from("monthly_snapshots")
      .select("id")
      .eq("snapshot_month", input.snapshotMonth)
      .eq("market_id", input.marketId)
      .is("listing_id", null)
      .maybeSingle();

    const payload = {
      snapshot_month: input.snapshotMonth,
      market_id: input.marketId,
      listing_id: null,
      occupancy_pct: input.occupancyPct,
      metrics: input.metrics,
    };

    if (existing?.id) {
      const { error } = await this.db.from("monthly_snapshots").update(payload).eq("id", existing.id as string);
      if (error) throw error;
    } else {
      const { error } = await this.db.from("monthly_snapshots").insert(payload);
      if (error) throw error;
    }
  }
}
