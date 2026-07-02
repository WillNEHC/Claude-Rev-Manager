import { handleTrends } from "../../../api/handlers";
import { dashboardRepo } from "../../lib/server";
import { queryParams, json } from "../../lib/respond";

export async function GET(req: Request): Promise<Response> {
  return json(await handleTrends(dashboardRepo(), queryParams(req.url)));
}
