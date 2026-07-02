import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DashboardRepository,
  OverviewData,
  RecommendationRow,
  TrendRow,
  EvidenceRow,
  InsightRow,
} from "../../api/handlers";

/**
 * Supabase-backed read repository for the dashboard API. Read-only selects over
 * the materialized engine outputs; no heavy computation on request (docs/08).
 */
export class SupabaseDashboardRepository implements DashboardRepository {
  constructor(private readonly db: SupabaseClient) {}

  async overview(marketSlug?: string): Promise<OverviewData> {
    const marketId = marketSlug ? await this.marketId(marketSlug) : null;

    let reviewQ = this.db.from("reviews").select("id", { count: "exact", head: true });
    if (marketId) reviewQ = reviewQ.eq("market_id", marketId);
    const { count: reviewCount } = await reviewQ;

    const recs = await this.listRecommendations({ marketSlug, sort: "priority", limit: 5 });
    const risingSignals = await this.listTrends({ marketSlug, direction: "up", limit: 5 });

    return {
      marketSlug: marketSlug ?? null,
      reviewCount: reviewCount ?? 0,
      recommendationCount: recs.length,
      topRecommendations: recs,
      risingSignals,
    };
  }

  async listRecommendations(params: {
    marketSlug?: string;
    sort: "priority" | "roi" | "cost";
    limit: number;
  }): Promise<RecommendationRow[]> {
    const orderCol =
      params.sort === "cost" ? "implementation_cost_usd" : params.sort === "roi" ? "roi_class" : "priority_score";
    let q = this.db
      .from("recommendations")
      .select("id, title, priority_score, roi_class, confidence, supporting_review_count, status, markets(slug)")
      .eq("status", "active")
      .order(orderCol, { ascending: params.sort === "cost" })
      .limit(params.limit);
    if (params.marketSlug) {
      const id = await this.marketId(params.marketSlug);
      if (id) q = q.eq("market_id", id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const market = row.markets as { slug?: string } | null;
      return {
        id: row.id as string,
        marketSlug: market?.slug ?? "",
        title: row.title as string,
        priorityScore: Number(row.priority_score ?? 0),
        roiClass: row.roi_class as string,
        confidence: Number(row.confidence ?? 0),
        supportingReviewCount: Number(row.supporting_review_count ?? 0),
        changeType: "active",
        evidenceRef: { subjectType: "recommendation", subjectId: row.id as string },
      };
    });
  }

  async listTrends(params: { marketSlug?: string; direction?: "up" | "down"; limit: number }): Promise<TrendRow[]> {
    let q = this.db
      .from("trend_history")
      .select("metric_key, direction, delta_pct, sample_size")
      .order("delta_pct", { ascending: false })
      .limit(params.limit);
    if (params.direction) q = q.eq("direction", params.direction);
    if (params.marketSlug) {
      const id = await this.marketId(params.marketSlug);
      if (id) q = q.eq("market_id", id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        metricKey: row.metric_key as string,
        direction: row.direction as string,
        deltaPct: row.delta_pct === null ? null : Number(row.delta_pct),
        sampleSize: Number(row.sample_size ?? 0),
      };
    });
  }

  async getEvidence(subjectType: string, subjectId: string): Promise<EvidenceRow[]> {
    const { data, error } = await this.db
      .from("evidence")
      .select("review_id, excerpt, weight")
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId);
    if (error) throw error;
    return (data ?? []).map((e) => {
      const row = e as Record<string, unknown>;
      return {
        reviewId: (row.review_id as string) ?? undefined,
        excerpt: row.excerpt as string,
        weight: Number(row.weight ?? 1),
      };
    });
  }

  async compareMarkets(): Promise<InsightRow[]> {
    const { data, error } = await this.db
      .from("market_insights")
      .select("id, insight_type, title, summary, confidence, markets(slug)")
      .eq("insight_type", "market_profile")
      .order("confidence", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const market = row.markets as { slug?: string } | null;
      return {
        marketSlug: market?.slug ?? "",
        title: row.title as string,
        summary: row.summary as string,
        confidence: Number(row.confidence ?? 0),
        evidenceRef: { subjectType: "market_insight", subjectId: row.id as string },
      };
    });
  }

  private async marketId(slug: string): Promise<string | null> {
    const { data } = await this.db.from("markets").select("id").eq("slug", slug).maybeSingle();
    return (data?.id as string) ?? null;
  }
}
