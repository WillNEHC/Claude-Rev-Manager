import type { PeriodMetric, AmenityStat, CategoryStat } from "./types";

/**
 * Read side for the engines: period metrics + per-market amenity/category stats.
 * The Supabase implementation runs SQL aggregation functions; the in-memory one
 * serves fixtures so the engines are testable without a database.
 */
export interface AnalyticsSource {
  getPeriodMetrics(periodStart: string): Promise<PeriodMetric[]>;
  getPreviousPeriodMetrics(periodStart: string): Promise<PeriodMetric[]>;
  getAmenityStats(periodStart: string): Promise<AmenityStat[]>;
  getCategoryStats(periodStart: string): Promise<CategoryStat[]>;
}

export class InMemoryAnalyticsSource implements AnalyticsSource {
  constructor(
    private readonly data: {
      current: PeriodMetric[];
      previous: PeriodMetric[];
      amenityStats: AmenityStat[];
      categoryStats: CategoryStat[];
    },
  ) {}

  async getPeriodMetrics(): Promise<PeriodMetric[]> {
    return this.data.current;
  }
  async getPreviousPeriodMetrics(): Promise<PeriodMetric[]> {
    return this.data.previous;
  }
  async getAmenityStats(): Promise<AmenityStat[]> {
    return this.data.amenityStats;
  }
  async getCategoryStats(): Promise<CategoryStat[]> {
    return this.data.categoryStats;
  }
}
