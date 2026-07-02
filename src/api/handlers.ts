import { z } from "zod";

/**
 * Framework-agnostic API handlers for the dashboard (docs/13). Each handler
 * validates its params with Zod and reads through the DashboardRepository, so
 * the Next.js route files are thin wrappers and the logic is unit-testable with
 * an in-memory repository. Every analytic item carries confidence + an
 * evidence_ref the client can expand (docs/11).
 */

/* --- DTOs ---------------------------------------------------------------- */

export interface EvidenceRef {
  subjectType: string;
  subjectId: string;
}
export interface RecommendationRow {
  id: string;
  marketSlug: string;
  title: string;
  priorityScore: number;
  roiClass: string;
  confidence: number;
  supportingReviewCount: number;
  changeType: string;
  evidenceRef: EvidenceRef;
}
export interface TrendRow {
  metricKey: string;
  direction: string;
  deltaPct: number | null;
  sampleSize: number;
}
export interface EvidenceRow {
  reviewId?: string;
  excerpt: string;
  weight: number;
}
export interface OverviewData {
  marketSlug: string | null;
  reviewCount: number;
  recommendationCount: number;
  topRecommendations: RecommendationRow[];
  risingSignals: TrendRow[];
}
export interface InsightRow {
  marketSlug: string;
  title: string;
  summary: string;
  confidence: number;
  evidenceRef: EvidenceRef;
}

export interface DashboardRepository {
  overview(marketSlug?: string): Promise<OverviewData>;
  listRecommendations(params: { marketSlug?: string; sort: "priority" | "roi" | "cost"; limit: number }): Promise<RecommendationRow[]>;
  listTrends(params: { marketSlug?: string; direction?: "up" | "down"; limit: number }): Promise<TrendRow[]>;
  getEvidence(subjectType: string, subjectId: string): Promise<EvidenceRow[]>;
  compareMarkets(): Promise<InsightRow[]>;
}

/* --- param schemas ------------------------------------------------------- */

const marketSlug = z.string().regex(/^[a-z0-9-]+$/).optional();

export const recommendationsQuery = z.object({
  market: marketSlug,
  sort: z.enum(["priority", "roi", "cost"]).default("priority"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const trendsQuery = z.object({
  market: marketSlug,
  direction: z.enum(["up", "down"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const evidenceQuery = z.object({
  subject_type: z.enum(["recommendation", "opportunity", "market_insight", "amenity_class", "trend"]),
  subject_id: z.string().uuid(),
});
export const overviewQuery = z.object({ market: marketSlug });

export type HandlerResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function badRequest(err: z.ZodError): HandlerResult<never> {
  return { ok: false, status: 400, error: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

/* --- handlers ------------------------------------------------------------ */

export async function handleOverview(repo: DashboardRepository, params: unknown): Promise<HandlerResult<OverviewData>> {
  const p = overviewQuery.safeParse(params);
  if (!p.success) return badRequest(p.error);
  return { ok: true, data: await repo.overview(p.data.market) };
}

export async function handleRecommendations(
  repo: DashboardRepository,
  params: unknown,
): Promise<HandlerResult<RecommendationRow[]>> {
  const p = recommendationsQuery.safeParse(params);
  if (!p.success) return badRequest(p.error);
  return { ok: true, data: await repo.listRecommendations({ marketSlug: p.data.market, sort: p.data.sort, limit: p.data.limit }) };
}

export async function handleTrends(repo: DashboardRepository, params: unknown): Promise<HandlerResult<TrendRow[]>> {
  const p = trendsQuery.safeParse(params);
  if (!p.success) return badRequest(p.error);
  return { ok: true, data: await repo.listTrends({ marketSlug: p.data.market, direction: p.data.direction, limit: p.data.limit }) };
}

export async function handleEvidence(repo: DashboardRepository, params: unknown): Promise<HandlerResult<EvidenceRow[]>> {
  const p = evidenceQuery.safeParse(params);
  if (!p.success) return badRequest(p.error);
  return { ok: true, data: await repo.getEvidence(p.data.subject_type, p.data.subject_id) };
}

export async function handleCompare(repo: DashboardRepository): Promise<HandlerResult<InsightRow[]>> {
  return { ok: true, data: await repo.compareMarkets() };
}
