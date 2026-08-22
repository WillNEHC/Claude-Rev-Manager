import type { SupabaseClient } from "@supabase/supabase-js";
import type { EngineRepository } from "../../engines/repository";
import { assertEvidence } from "../../engines/repository";
import type {
  TrendPoint,
  AmenityClassification,
  Opportunity,
  MarketInsight,
  Recommendation,
  EvidenceItem,
} from "../../engines/types";

/**
 * Supabase-backed engine repository. Persists engine outputs to trend_history,
 * amenities (classification), opportunities, market_insights, recommendations +
 * recommendation_history, and writes evidence rows for every evidence-bearing
 * object (invariant enforced before write). See docs/03, docs/11.
 */
export class SupabaseEngineRepository implements EngineRepository {
  constructor(private readonly db: SupabaseClient) {}

  async saveTrends(points: TrendPoint[]): Promise<void> {
    if (points.length === 0) return;
    const rows = points.map((p) => ({
      market_id: p.marketId,
      metric_key: p.metricKey,
      entity_type: p.entityType,
      entity_id: p.entityId ?? null,
      period_start: p.periodStart,
      period_grain: p.periodGrain,
      value: p.value,
      prev_value: p.prevValue,
      delta: p.delta,
      delta_pct: p.deltaPct,
      direction: p.direction,
      sample_size: p.sampleSize,
    }));
    const { error } = await this.db
      .from("trend_history")
      .upsert(rows, { onConflict: "market_id,metric_key,period_start,period_grain" });
    if (error) throw error;
  }

  async saveAmenityClassifications(classifications: AmenityClassification[]): Promise<void> {
    for (const c of classifications) {
      const { error } = await this.db
        .from("amenities")
        .update({ classification: c.classification, classification_confidence: c.confidence })
        .eq("slug", c.amenitySlug);
      if (error) throw error;
      if (c.amenityId && c.evidence.length > 0) {
        await this.writeEvidence("amenity_class", c.amenityId, c.evidence);
      }
    }
  }

  async saveOpportunities(_reportMonth: string, opportunities: Opportunity[]): Promise<void> {
    for (const o of opportunities) {
      assertEvidence("opportunity", o.title, o.evidence);
      const { data, error } = await this.db
        .from("opportunities")
        .insert({
          market_id: o.marketId,
          gap_type: o.gapType,
          title: o.title,
          description: o.description,
          estimated_cost_usd: o.estimatedCostUsd,
          difficulty: o.difficulty,
          expected_review_impact: o.expectedReviewImpact,
          expected_revenue_impact_usd: o.expectedRevenueImpactUsd,
          confidence: o.confidence,
          supporting_review_count: o.supportingReviewCount,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      await this.writeEvidence("opportunity", data.id as string, o.evidence);
    }
  }

  async saveMarketInsights(_periodStart: string, insights: MarketInsight[]): Promise<void> {
    for (const i of insights) {
      assertEvidence("market_insight", i.title, i.evidence);
      const { data, error } = await this.db
        .from("market_insights")
        .insert({
          market_id: i.marketId,
          insight_type: i.insightType,
          title: i.title,
          summary: i.summary,
          confidence: i.confidence,
          supporting_review_count: i.supportingReviewCount,
        })
        .select("id")
        .single();
      if (error) throw error;
      await this.writeEvidence("market_insight", data.id as string, i.evidence);
    }
  }

  async getPreviousRecommendations(reportMonth: string): Promise<Recommendation[]> {
    const { data, error } = await this.db
      .from("recommendations")
      .select("id, rec_key, market_id, title, priority_score, roi_class")
      .eq("report_month", reportMonth);
    if (error) throw error;
    // Load evidence for prior recs so retired ones can carry it forward.
    const recs: Recommendation[] = [];
    for (const r of data ?? []) {
      const row = r as Record<string, unknown>;
      const evidence = await this.readEvidence("recommendation", row.id as string);
      recs.push({
        key: (row.rec_key as string) ?? (row.id as string),
        marketId: row.market_id as string,
        reportMonth,
        title: row.title as string,
        ownerExplanation: "",
        operatorExplanation: "",
        supportingReviewCount: 0,
        confidence: 0,
        roiClass: (row.roi_class as Recommendation["roiClass"]) ?? "unproven",
        expectedGuestImpact: "",
        priorityScore: Number(row.priority_score ?? 0),
        changeType: "persisted",
        evidence: evidence.length > 0 ? evidence : [{ excerpt: "(prior)" }],
      });
    }
    return recs;
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    for (const r of recommendations) {
      assertEvidence("recommendation", r.key, r.evidence);
      const { data, error } = await this.db
        .from("recommendations")
        .insert({
          rec_key: r.key,
          market_id: r.marketId,
          report_month: r.reportMonth,
          title: r.title,
          owner_explanation: r.ownerExplanation,
          operator_explanation: r.operatorExplanation,
          supporting_review_count: r.supportingReviewCount,
          confidence: r.confidence,
          implementation_cost_usd: r.implementationCostUsd,
          roi_class: r.roiClass,
          difficulty: r.difficulty,
          expected_guest_impact: r.expectedGuestImpact,
          expected_revenue_impact_usd: r.expectedRevenueImpactUsd,
          priority_score: r.priorityScore,
          last_observed_trend: r.lastObservedTrend,
          status: r.changeType === "retired" ? "retired" : "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      const recId = data.id as string;
      await this.writeEvidence("recommendation", recId, r.evidence);
      await this.db.from("recommendation_history").insert({
        recommendation_id: recId,
        report_month: r.reportMonth,
        change_type: r.changeType,
        new_priority_score: r.priorityScore,
      });
    }
  }

  private async writeEvidence(subjectType: string, subjectId: string, evidence: EvidenceItem[]): Promise<void> {
    if (evidence.length === 0) return;
    const rows = evidence.map((e) => ({
      subject_type: subjectType,
      subject_id: subjectId,
      review_id: e.reviewId ?? null,
      listing_id: e.listingId ?? null,
      excerpt: e.excerpt,
      weight: e.weight ?? 1.0,
    }));
    const { error } = await this.db.from("evidence").insert(rows);
    if (error) throw error;
  }

  private async readEvidence(subjectType: string, subjectId: string): Promise<EvidenceItem[]> {
    const { data } = await this.db
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
        weight: (row.weight as number) ?? 1,
      };
    });
  }
}
