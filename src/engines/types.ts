/**
 * Shared types for the intelligence engines. Engines are pure functions over
 * these aggregate inputs; they emit analytic objects that always carry the
 * evidence that backs them (docs/11 — no conclusion without evidence).
 */

export type AmenityClass = "table_stakes" | "delight" | "unknown";
export type Difficulty = "trivial" | "easy" | "moderate" | "hard" | "major_capex";
export type RoiClass = "low" | "moderate" | "high" | "exceptional" | "unproven";
export type ChangeType = "new" | "persisted" | "strengthened" | "weakened" | "retired";

/** A citation: a supporting review excerpt (docs/11). weight defaults to 1. */
export interface EvidenceItem {
  reviewId?: string;
  listingId?: string;
  excerpt: string;
  weight?: number;
}

/* --- Analytics inputs (provided by the AnalyticsSource) ------------------ */

/** A measured metric value for a market/entity in one period. */
export interface PeriodMetric {
  metricKey: string; // e.g. amenity.fire_pit.mention_rate
  entityType: string; // amenity | category | persona | market | place
  entityId?: string;
  marketId: string;
  periodStart: string; // YYYY-MM-01
  value: number;
  sampleSize: number;
}

/** Per-market amenity signal used by the Expectation Index + Opportunity engine. */
export interface AmenityStat {
  marketId: string;
  amenitySlug: string;
  amenityId?: string;
  reviewsInPeriod: number; // denominator for prevalence
  mentions: number;
  positive: number;
  negative: number;
  delighterCooccur: number; // mentions co-occurring with a delighter / is_exceptional
  evidence: EvidenceItem[];
}

/** Per-market category signal used by Market Comparison. */
export interface CategoryStat {
  marketId: string;
  categorySlug: string;
  categoryId?: string;
  mentions: number;
  positive: number;
  negative: number;
  evidence: EvidenceItem[];
}

/* --- Engine outputs ------------------------------------------------------ */

export interface TrendPoint {
  marketId: string;
  metricKey: string;
  entityType: string;
  entityId?: string;
  periodStart: string;
  periodGrain: "month" | "season" | "year";
  value: number;
  prevValue: number | null;
  delta: number | null;
  deltaPct: number | null;
  direction: "up" | "down" | "flat" | "new";
  sampleSize: number;
}

export interface AmenityClassification {
  amenitySlug: string;
  amenityId?: string;
  classification: AmenityClass;
  confidence: number;
  signals: { prevalence: number; positiveRate: number; negativeRate: number; delighterRate: number };
  evidence: EvidenceItem[];
}

export interface Opportunity {
  marketId: string;
  gapType: string; // amenity | service | experience | operational | luxury | family | pet
  title: string;
  description: string;
  amenitySlug?: string;
  estimatedCostUsd?: number;
  difficulty?: Difficulty;
  expectedReviewImpact?: number;
  expectedRevenueImpactUsd?: number;
  confidence: number;
  supportingReviewCount: number;
  evidence: EvidenceItem[];
}

export interface MarketInsight {
  marketId: string;
  insightType: string;
  title: string;
  summary: string;
  confidence: number;
  supportingReviewCount: number;
  evidence: EvidenceItem[];
}

export interface Recommendation {
  /** Stable identity for month-over-month diffing (market + gap + amenity). */
  key: string;
  marketId: string;
  reportMonth: string; // YYYY-MM-01
  title: string;
  ownerExplanation: string;
  operatorExplanation: string;
  supportingReviewCount: number;
  confidence: number;
  implementationCostUsd?: number;
  roiClass: RoiClass;
  difficulty?: Difficulty;
  expectedGuestImpact: string;
  expectedRevenueImpactUsd?: number;
  priorityScore: number;
  lastObservedTrend?: string;
  changeType: ChangeType;
  evidence: EvidenceItem[];
}
