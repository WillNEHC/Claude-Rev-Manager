import { createServiceClient } from "../../../lib/db/client";
import { buildReportInput } from "../../../reports/build";
import { assembleReport } from "../../../reports/generate";
import { renderHtml } from "../../../reports/render";
import { queryParams } from "../../lib/respond";

/**
 * GET /api/reports?market=<slug>&month=YYYY-MM-01[&format=html|json]
 * Renders the monthly report as self-contained HTML (default) or JSON.
 */
export async function GET(req: Request): Promise<Response> {
  const p = queryParams(req.url);
  const marketSlug = p.market;
  const month = p.month;
  if (!marketSlug || !month) {
    return Response.json({ error: { code: "bad_request", message: "market and month are required" } }, { status: 400 });
  }
  const input = await buildReportInput(createServiceClient(), { marketSlug, month });
  const report = assembleReport(input);
  if (p.format === "json") return Response.json(report);
  return new Response(renderHtml(report), { headers: { "content-type": "text/html; charset=utf-8" } });
}
