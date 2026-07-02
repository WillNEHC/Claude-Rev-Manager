import type { SupabaseClient } from "@supabase/supabase-js";
import type { Retriever } from "../../rag/retriever";
import type { RetrievedChunk, StructuredRow, QuestionFilters } from "../../rag/types";
import type { EmbeddingProvider } from "../../ai/embed";

/**
 * Supabase retriever: semantic search embeds the question and calls the
 * match_reviews() function (migration 0004); structured search answers
 * aggregation questions from local_businesses, trend_history, and
 * recommendations. Returns the same shapes as the in-memory fake.
 */
export class SupabaseRetriever implements Retriever {
  constructor(
    private readonly db: SupabaseClient,
    private readonly embedder: EmbeddingProvider,
  ) {}

  async semanticSearch(input: {
    question: string;
    marketId?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<RetrievedChunk[]> {
    const [embedding] = await this.embedder.embed([input.question]);
    if (!embedding) return [];
    const { data, error } = await this.db.rpc("match_reviews", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: input.limit ?? 20,
      filter_market: input.marketId ?? null,
      min_similarity: input.minSimilarity ?? 0.2,
    });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      reviewId: r.review_id as string,
      marketId: r.market_id as string,
      content: r.content as string,
      similarity: Number(r.similarity),
    }));
  }

  async structured(input: { filters: QuestionFilters; limit?: number }): Promise<StructuredRow[]> {
    const limit = input.limit ?? 10;
    const f = input.filters;
    const marketId = f.marketSlug ? await this.resolveMarketId(f.marketSlug) : null;

    // Most-mentioned local places.
    if (f.placeType) {
      let q = this.db
        .from("local_businesses")
        .select("name, place_type, mention_count, avg_sentiment")
        .eq("place_type", f.placeType)
        .order("mention_count", { ascending: false })
        .limit(limit);
      if (marketId) q = q.eq("market_id", marketId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return {
          kind: "place",
          label: row.name as string,
          value: Number(row.mention_count),
          detail: `avg sentiment ${Number(row.avg_sentiment ?? 0).toFixed(2)}`,
        };
      });
    }

    // Trending amenities.
    if (f.direction) {
      let q = this.db
        .from("trend_history")
        .select("metric_key, delta_pct, direction, sample_size")
        .eq("direction", f.direction)
        .like("metric_key", "amenity.%.mention_rate")
        .order("delta_pct", { ascending: f.direction === "down" })
        .limit(limit);
      if (marketId) q = q.eq("market_id", marketId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return {
          kind: "amenity_trend",
          label: (row.metric_key as string).replace(/^amenity\.|\.mention_rate$/g, ""),
          value: `${(Number(row.delta_pct) * 100).toFixed(0)}%`,
          detail: `${row.direction}, n=${row.sample_size}`,
        };
      });
    }

    // Default: top recommendations.
    let q = this.db
      .from("recommendations")
      .select("title, priority_score, roi_class, market_id")
      .eq("status", "active")
      .order("priority_score", { ascending: false })
      .limit(limit);
    if (marketId) q = q.eq("market_id", marketId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        kind: "recommendation",
        label: row.title as string,
        value: Number(row.priority_score),
        detail: `ROI ${row.roi_class}`,
      };
    });
  }

  async resolveMarketId(slug: string): Promise<string | null> {
    const { data } = await this.db.from("markets").select("id").eq("slug", slug).maybeSingle();
    return (data?.id as string) ?? null;
  }
}
