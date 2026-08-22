import type { Difficulty } from "./types";

/**
 * Priority scoring for recommendations (docs/06, docs/14). Weights are
 * config-driven so the operator can bias toward low-cost quick wins vs. capex
 * bets. Cost/difficulty are penalties; trend momentum is a bonus for rising signals.
 */

export interface ScoringWeights {
  confidence: number;
  guestImpact: number;
  revenue: number;
  difficultyPenalty: number;
  costPenalty: number;
  trendMomentum: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  confidence: 0.3,
  guestImpact: 0.25,
  revenue: 0.2,
  difficultyPenalty: 0.15,
  costPenalty: 0.1,
  trendMomentum: 0.1,
};

const DIFFICULTY_PENALTY: Record<Difficulty, number> = {
  trivial: 0,
  easy: 0.2,
  moderate: 0.5,
  hard: 0.8,
  major_capex: 1,
};

export interface PriorityInputs {
  confidence: number; // 0..1
  expectedGuestImpact: number; // normalized 0..1 (e.g. rating delta scaled)
  expectedRevenueImpactUsd?: number;
  difficulty?: Difficulty;
  estimatedCostUsd?: number;
  trendMomentum: number; // 0..1 (rising signal strength)
}

export interface PriorityContext {
  maxRevenueUsd: number; // for normalizing revenue across the batch
  maxCostUsd: number; // for normalizing the cost penalty
  weights?: ScoringWeights;
}

/** Blended priority score in ~[0,1+]; higher ranks first. */
export function priorityScore(inputs: PriorityInputs, ctx: PriorityContext): number {
  const w = ctx.weights ?? DEFAULT_WEIGHTS;
  const revenueNorm = ctx.maxRevenueUsd > 0 ? (inputs.expectedRevenueImpactUsd ?? 0) / ctx.maxRevenueUsd : 0;
  const costNorm = ctx.maxCostUsd > 0 ? (inputs.estimatedCostUsd ?? 0) / ctx.maxCostUsd : 0;
  const diffPenalty = inputs.difficulty ? DIFFICULTY_PENALTY[inputs.difficulty] : 0.5;

  const score =
    w.confidence * clamp01(inputs.confidence) +
    w.guestImpact * clamp01(inputs.expectedGuestImpact) +
    w.revenue * clamp01(revenueNorm) -
    w.difficultyPenalty * diffPenalty -
    w.costPenalty * clamp01(costNorm) +
    w.trendMomentum * clamp01(inputs.trendMomentum);

  return Math.round(Math.max(0, score) * 1e4) / 1e4;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
