/**
 * Health evaluation for monitoring hooks (docs/04, docs/12). Pure function over
 * recent job metrics → a list of alerts. The monitor job gathers the inputs from
 * the database and routes the alerts to a sink. Thresholds are configurable.
 */

export interface CrawlRunSummary {
  source: string;
  status: "running" | "succeeded" | "partial" | "failed";
  reviewsFound: number;
  reviewsNew: number;
  pagesFetched: number;
}

export interface HealthInputs {
  crawlRuns: CrawlRunSummary[];
  extractionProcessed?: number;
  extractionFailed?: number;
  firecrawlPagesFetched?: number;
  firecrawlBudgetPages?: number;
}

export interface HealthThresholds {
  extractionWarnRate: number;
  extractionCriticalRate: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  extractionWarnRate: 0.1,
  extractionCriticalRate: 0.3,
};

export type Severity = "warn" | "critical";
export interface Alert {
  severity: Severity;
  code: string;
  message: string;
}

export function evaluateHealth(inputs: HealthInputs, thresholds: HealthThresholds = DEFAULT_THRESHOLDS): Alert[] {
  const alerts: Alert[] = [];

  for (const run of inputs.crawlRuns) {
    if (run.status === "failed") {
      alerts.push({ severity: "critical", code: "crawl_failed", message: `Crawl run for ${run.source} failed.` });
    } else if (run.status === "partial") {
      alerts.push({ severity: "warn", code: "crawl_partial", message: `Crawl run for ${run.source} completed partially (some listings degraded).` });
    }
    // A completed run that found zero reviews is suspicious (selector drift / block).
    if ((run.status === "succeeded" || run.status === "partial") && run.pagesFetched > 0 && run.reviewsFound === 0) {
      alerts.push({ severity: "warn", code: "no_reviews_found", message: `${run.source} fetched pages but found no reviews — possible source change or block.` });
    }
  }

  const processed = inputs.extractionProcessed ?? 0;
  const failed = inputs.extractionFailed ?? 0;
  const total = processed + failed;
  if (total > 0) {
    const rate = failed / total;
    if (rate >= thresholds.extractionCriticalRate) {
      alerts.push({ severity: "critical", code: "extraction_failure_rate", message: `Extraction failure rate ${(rate * 100).toFixed(0)}% (${failed}/${total}).` });
    } else if (rate >= thresholds.extractionWarnRate) {
      alerts.push({ severity: "warn", code: "extraction_failure_rate", message: `Extraction failure rate elevated: ${(rate * 100).toFixed(0)}% (${failed}/${total}).` });
    }
  }

  if (
    inputs.firecrawlBudgetPages !== undefined &&
    inputs.firecrawlPagesFetched !== undefined &&
    inputs.firecrawlPagesFetched > inputs.firecrawlBudgetPages
  ) {
    alerts.push({ severity: "warn", code: "firecrawl_budget", message: `Firecrawl pages fetched (${inputs.firecrawlPagesFetched}) exceeded budget (${inputs.firecrawlBudgetPages}).` });
  }

  return alerts;
}
