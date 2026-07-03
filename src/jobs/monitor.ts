/**
 * monitor — evaluate recent pipeline health and emit alerts (docs/04, docs/12).
 * Reads recent crawl_runs + extraction failure counts, runs evaluateHealth, and
 * routes alerts to a webhook (GDIP_ALERT_WEBHOOK) or the log.
 *
 * Usage: npm run monitor
 * Requires SUPABASE_*.
 */
import { createServiceClient } from "../lib/db/client";
import { evaluateHealth, type CrawlRunSummary } from "../monitoring/health";
import { LoggerAlertSink, WebhookAlertSink, type AlertSink } from "../monitoring/sink";
import { logger } from "../lib/logging";

async function main(): Promise<void> {
  const db = createServiceClient();

  const { data: runRows } = await db
    .from("crawl_runs")
    .select("source, status, reviews_found, reviews_new, pages_fetched")
    .order("started_at", { ascending: false })
    .limit(20);
  const crawlRuns: CrawlRunSummary[] = (runRows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      source: row.source as string,
      status: row.status as CrawlRunSummary["status"],
      reviewsFound: Number(row.reviews_found ?? 0),
      reviewsNew: Number(row.reviews_new ?? 0),
      pagesFetched: Number(row.pages_fetched ?? 0),
    };
  });

  const { count: processed } = await db.from("review_extractions").select("review_id", { count: "exact", head: true });
  const { count: failed } = await db
    .from("extraction_failures")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false);

  const budget = process.env.GDIP_FIRECRAWL_BUDGET_PAGES ? Number(process.env.GDIP_FIRECRAWL_BUDGET_PAGES) : undefined;
  const alerts = evaluateHealth({
    crawlRuns,
    extractionProcessed: processed ?? 0,
    extractionFailed: failed ?? 0,
    firecrawlPagesFetched: budget !== undefined ? crawlRuns.reduce((a, r) => a + r.pagesFetched, 0) : undefined,
    firecrawlBudgetPages: budget,
  });

  const sink: AlertSink = process.env.GDIP_ALERT_WEBHOOK
    ? new WebhookAlertSink(process.env.GDIP_ALERT_WEBHOOK)
    : new LoggerAlertSink(logger);
  await sink.emit(alerts);
  logger.info({ alerts: alerts.length, criticals: alerts.filter((a) => a.severity === "critical").length }, "monitor complete");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "monitor failed");
  process.exitCode = 1;
});
