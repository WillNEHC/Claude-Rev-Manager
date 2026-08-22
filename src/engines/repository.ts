import type {
  TrendPoint,
  AmenityClassification,
  Opportunity,
  MarketInsight,
  Recommendation,
} from "./types";

/**
 * Write side for the engines. The persist methods for evidence-bearing objects
 * (opportunities, insights, recommendations) ENFORCE the evidence invariant:
 * attempting to persist one with no evidence throws. This makes "no conclusion
 * without evidence" (docs/11) a structural guarantee, not a convention.
 */
export interface EngineRepository {
  saveTrends(points: TrendPoint[]): Promise<void>;
  saveAmenityClassifications(classifications: AmenityClassification[]): Promise<void>;
  saveOpportunities(reportMonth: string, opportunities: Opportunity[]): Promise<void>;
  saveMarketInsights(periodStart: string, insights: MarketInsight[]): Promise<void>;
  getPreviousRecommendations(reportMonth: string): Promise<Recommendation[]>;
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
}

/** Thrown when an evidence-bearing analytic object has no supporting evidence. */
export class MissingEvidenceError extends Error {
  constructor(kind: string, detail: string) {
    super(`evidence invariant violated: ${kind} has no evidence (${detail})`);
    this.name = "MissingEvidenceError";
  }
}

export function assertEvidence(kind: string, detail: string, evidence: { length: number }): void {
  if (evidence.length === 0) throw new MissingEvidenceError(kind, detail);
}

/* --- In-memory implementation (tests) ------------------------------------ */

export class InMemoryEngineRepository implements EngineRepository {
  trends: TrendPoint[] = [];
  classifications: AmenityClassification[] = [];
  opportunities: Opportunity[] = [];
  insights: MarketInsight[] = [];
  recommendations: Recommendation[] = [];
  private priorRecs: Recommendation[] = [];

  seedPreviousRecommendations(recs: Recommendation[]): void {
    this.priorRecs = recs;
  }

  async saveTrends(points: TrendPoint[]): Promise<void> {
    this.trends.push(...points);
  }

  async saveAmenityClassifications(classifications: AmenityClassification[]): Promise<void> {
    this.classifications.push(...classifications);
  }

  async saveOpportunities(_reportMonth: string, opportunities: Opportunity[]): Promise<void> {
    for (const o of opportunities) assertEvidence("opportunity", o.title, o.evidence);
    this.opportunities.push(...opportunities);
  }

  async saveMarketInsights(_periodStart: string, insights: MarketInsight[]): Promise<void> {
    for (const i of insights) assertEvidence("market_insight", i.title, i.evidence);
    this.insights.push(...insights);
  }

  async getPreviousRecommendations(): Promise<Recommendation[]> {
    return this.priorRecs;
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    for (const r of recommendations) assertEvidence("recommendation", r.key, r.evidence);
    this.recommendations.push(...recommendations);
  }
}
