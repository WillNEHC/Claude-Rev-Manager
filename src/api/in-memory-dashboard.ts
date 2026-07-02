import type {
  DashboardRepository,
  OverviewData,
  RecommendationRow,
  TrendRow,
  EvidenceRow,
  InsightRow,
} from "./handlers";

/** In-memory DashboardRepository for tests / local dev. */
export class InMemoryDashboardRepository implements DashboardRepository {
  constructor(
    private readonly data: {
      reviewCount?: number;
      recommendations?: RecommendationRow[];
      trends?: TrendRow[];
      evidence?: Record<string, EvidenceRow[]>; // `${subjectType}:${subjectId}` -> rows
      insights?: InsightRow[];
    } = {},
  ) {}

  async overview(marketSlug?: string): Promise<OverviewData> {
    const recs = this.filterRecs(marketSlug);
    return {
      marketSlug: marketSlug ?? null,
      reviewCount: this.data.reviewCount ?? 0,
      recommendationCount: recs.length,
      topRecommendations: recs.slice(0, 5),
      risingSignals: (this.data.trends ?? []).filter((t) => t.direction === "up").slice(0, 5),
    };
  }

  async listRecommendations(params: {
    marketSlug?: string;
    sort: "priority" | "roi" | "cost";
    limit: number;
  }): Promise<RecommendationRow[]> {
    const recs = this.filterRecs(params.marketSlug).sort((a, b) => b.priorityScore - a.priorityScore);
    return recs.slice(0, params.limit);
  }

  async listTrends(params: { marketSlug?: string; direction?: "up" | "down"; limit: number }): Promise<TrendRow[]> {
    let t = this.data.trends ?? [];
    if (params.direction) t = t.filter((x) => x.direction === params.direction);
    return t.slice(0, params.limit);
  }

  async getEvidence(subjectType: string, subjectId: string): Promise<EvidenceRow[]> {
    return this.data.evidence?.[`${subjectType}:${subjectId}`] ?? [];
  }

  async compareMarkets(): Promise<InsightRow[]> {
    return this.data.insights ?? [];
  }

  private filterRecs(marketSlug?: string): RecommendationRow[] {
    const recs = this.data.recommendations ?? [];
    return marketSlug ? recs.filter((r) => r.marketSlug === marketSlug) : recs;
  }
}
