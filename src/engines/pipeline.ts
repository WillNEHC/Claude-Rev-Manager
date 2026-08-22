import type { AnalyticsSource } from "./analytics";
import type { EngineRepository } from "./repository";
import { computeTrends, trendsByKey } from "./trends";
import { classifyAmenities, type ExpectationOptions } from "./expectation-index";
import { detectAmenityOpportunities, type OpportunityOptions } from "./opportunities";
import { compareMarkets } from "./compare";
import { buildRecommendations } from "./recommend";
import type { ScoringWeights } from "./scoring";
import type { Recommendation } from "./types";
import type { Logger } from "../lib/logging";
import { logger as rootLogger } from "../lib/logging";

/**
 * The monthly intelligence pipeline (docs/06). Runs the engines in order —
 * trends → expectation index → opportunities → market comparison →
 * recommendations — persisting each stage's evidence-backed output. The result
 * is the ranked Top-25 recommendation deliverable.
 */

export interface MonthlyPipelineInput {
  analytics: AnalyticsSource;
  repo: EngineRepository;
  reportMonth: string; // YYYY-MM-01
  grain?: "month" | "season" | "year";
  weights?: ScoringWeights;
  expectation?: ExpectationOptions;
  opportunity?: OpportunityOptions;
  logger?: Logger;
}

export interface MonthlyPipelineResult {
  trends: number;
  classifications: number;
  opportunities: number;
  insights: number;
  recommendations: number;
  topRecommendations: Recommendation[];
}

export async function runMonthlyPipeline(input: MonthlyPipelineInput): Promise<MonthlyPipelineResult> {
  const log = (input.logger ?? rootLogger).child({ job: "monthly-pipeline", month: input.reportMonth });

  // 1. Trends (current vs previous period).
  const current = await input.analytics.getPeriodMetrics(input.reportMonth);
  const previous = await input.analytics.getPreviousPeriodMetrics(input.reportMonth);
  const trends = computeTrends(current, previous, { grain: input.grain });
  await input.repo.saveTrends(trends);

  // 2. Guest Expectation Index.
  const amenityStats = await input.analytics.getAmenityStats(input.reportMonth);
  const categoryStats = await input.analytics.getCategoryStats(input.reportMonth);
  const classifications = classifyAmenities(amenityStats, input.expectation);
  await input.repo.saveAmenityClassifications(classifications);

  // 3. Opportunities.
  const opportunities = detectAmenityOpportunities(amenityStats, classifications, input.opportunity);
  await input.repo.saveOpportunities(input.reportMonth, opportunities);

  // 4. Market comparison.
  const insights = compareMarkets(amenityStats, categoryStats);
  await input.repo.saveMarketInsights(input.reportMonth, insights);

  // 5. Recommendations (diffed against last month for continuity).
  const priorRecs = await input.repo.getPreviousRecommendations(previousMonth(input.reportMonth));
  const recommendations = buildRecommendations({
    opportunities,
    trends: trendsByKey(trends),
    priorRecommendations: priorRecs,
    reportMonth: input.reportMonth,
    weights: input.weights,
  });
  await input.repo.saveRecommendations(recommendations);

  const result: MonthlyPipelineResult = {
    trends: trends.length,
    classifications: classifications.length,
    opportunities: opportunities.length,
    insights: insights.length,
    recommendations: recommendations.length,
    topRecommendations: recommendations.filter((r) => r.changeType !== "retired").slice(0, 25),
  };
  log.info(
    {
      trends: result.trends,
      classifications: result.classifications,
      opportunities: result.opportunities,
      insights: result.insights,
      recommendations: result.recommendations,
    },
    "monthly pipeline complete",
  );
  return result;
}

/** First-of-previous-month key from a YYYY-MM-01 string. */
export function previousMonth(month: string): string {
  const d = new Date(`${month}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
