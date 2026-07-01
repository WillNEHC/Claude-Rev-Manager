/**
 * monthly-pipeline — run the intelligence engines for a report month and persist
 * ranked, evidence-backed recommendations (docs/06). Reads aggregates via the
 * SQL analytics functions; writes trends, classifications, opportunities,
 * insights, recommendations + history + evidence.
 *
 * Usage: npm run pipeline:monthly -- [YYYY-MM-01]
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServiceClient } from "../lib/db/client";
import { SupabaseAnalyticsSource } from "../lib/db/supabase-analytics";
import { SupabaseEngineRepository } from "../lib/db/supabase-engine-repository";
import { runMonthlyPipeline } from "../engines/pipeline";
import { logger } from "../lib/logging";

function firstOfThisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function main(): Promise<void> {
  const reportMonth = process.argv[2] || firstOfThisMonth();
  const db = createServiceClient();
  const result = await runMonthlyPipeline({
    analytics: new SupabaseAnalyticsSource(db),
    repo: new SupabaseEngineRepository(db),
    reportMonth,
    logger,
  });
  logger.info(
    {
      month: reportMonth,
      trends: result.trends,
      opportunities: result.opportunities,
      recommendations: result.recommendations,
      top: result.topRecommendations.slice(0, 5).map((r) => ({ title: r.title, priority: r.priorityScore })),
    },
    "monthly pipeline finished",
  );
}

main().catch((err) => {
  logger.error({ err: String(err) }, "monthly pipeline failed");
  process.exitCode = 1;
});
