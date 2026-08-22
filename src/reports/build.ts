import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportInput } from "./generate";
import type { Recommendation, TrendPoint, Opportunity, MarketInsight, EvidenceItem } from "../engines/types";

/**
 * Assemble a ReportInput from the materialized engine tables for a given market
 * and month. Read-only; the pure assembleReport/renderHtml do the rest.
 */
export async function buildReportInput(
  db: SupabaseClient,
  opts: { marketSlug: string; month: string },
): Promise<ReportInput> {
  const { data: market } = await db
    .from("markets")
    .select("id, name")
    .eq("slug", opts.marketSlug)
    .maybeSingle();
  if (!market) throw new Error(`market '${opts.marketSlug}' not found`);
  const marketId = market.id as string;

  const { count: reviewsAnalyzed } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("market_id", marketId);

  const { data: recRows } = await db
    .from("recommendations")
    .select("id, rec_key, title, owner_explanation, operator_explanation, supporting_review_count, confidence, implementation_cost_usd, roi_class, difficulty, expected_guest_impact, priority_score, last_observed_trend, status")
    .eq("market_id", marketId)
    .eq("report_month", opts.month);

  const recommendations: Recommendation[] = [];
  for (const r of recRows ?? []) {
    const row = r as Record<string, unknown>;
    const evidence = await loadEvidence(db, "recommendation", row.id as string);
    recommendations.push({
      key: (row.rec_key as string) ?? (row.id as string),
      marketId,
      reportMonth: opts.month,
      title: row.title as string,
      ownerExplanation: (row.owner_explanation as string) ?? "",
      operatorExplanation: (row.operator_explanation as string) ?? "",
      supportingReviewCount: Number(row.supporting_review_count ?? 0),
      confidence: Number(row.confidence ?? 0),
      implementationCostUsd: (row.implementation_cost_usd as number) ?? undefined,
      roiClass: (row.roi_class as Recommendation["roiClass"]) ?? "unproven",
      difficulty: (row.difficulty as Recommendation["difficulty"]) ?? undefined,
      expectedGuestImpact: (row.expected_guest_impact as string) ?? "",
      priorityScore: Number(row.priority_score ?? 0),
      lastObservedTrend: (row.last_observed_trend as string) ?? undefined,
      changeType: row.status === "retired" ? "retired" : "persisted",
      evidence,
    });
  }

  const { data: trendRows } = await db
    .from("trend_history")
    .select("metric_key, entity_type, period_start, value, prev_value, delta, delta_pct, direction, sample_size")
    .eq("market_id", marketId)
    .eq("period_start", opts.month);
  const trends: TrendPoint[] = (trendRows ?? []).map((t) => {
    const row = t as Record<string, unknown>;
    return {
      marketId,
      metricKey: row.metric_key as string,
      entityType: row.entity_type as string,
      periodStart: opts.month,
      periodGrain: "month",
      value: Number(row.value ?? 0),
      prevValue: row.prev_value === null ? null : Number(row.prev_value),
      delta: row.delta === null ? null : Number(row.delta),
      deltaPct: row.delta_pct === null ? null : Number(row.delta_pct),
      direction: row.direction as TrendPoint["direction"],
      sampleSize: Number(row.sample_size ?? 0),
    };
  });

  const { data: oppRows } = await db
    .from("opportunities")
    .select("gap_type, title, description, expected_review_impact, confidence, supporting_review_count")
    .eq("market_id", marketId);
  const opportunities: Opportunity[] = (oppRows ?? []).map((o) => {
    const row = o as Record<string, unknown>;
    return {
      marketId,
      gapType: row.gap_type as string,
      title: row.title as string,
      description: (row.description as string) ?? "",
      expectedReviewImpact: (row.expected_review_impact as number) ?? undefined,
      confidence: Number(row.confidence ?? 0),
      supportingReviewCount: Number(row.supporting_review_count ?? 0),
      evidence: [],
    };
  });

  const { data: insightRows } = await db
    .from("market_insights")
    .select("insight_type, title, summary, confidence, supporting_review_count")
    .eq("market_id", marketId);
  const insights: MarketInsight[] = (insightRows ?? []).map((i) => {
    const row = i as Record<string, unknown>;
    return {
      marketId,
      insightType: row.insight_type as string,
      title: row.title as string,
      summary: (row.summary as string) ?? "",
      confidence: Number(row.confidence ?? 0),
      supportingReviewCount: Number(row.supporting_review_count ?? 0),
      evidence: [],
    };
  });

  return {
    reportMonth: opts.month,
    marketName: market.name as string,
    reviewsAnalyzed: reviewsAnalyzed ?? 0,
    recommendations,
    trends,
    opportunities,
    insights,
  };
}

async function loadEvidence(db: SupabaseClient, subjectType: string, subjectId: string): Promise<EvidenceItem[]> {
  const { data } = await db
    .from("evidence")
    .select("review_id, listing_id, excerpt, weight")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId);
  return (data ?? []).map((e) => {
    const row = e as Record<string, unknown>;
    return {
      reviewId: (row.review_id as string) ?? undefined,
      listingId: (row.listing_id as string) ?? undefined,
      excerpt: row.excerpt as string,
      weight: Number(row.weight ?? 1),
    };
  });
}
