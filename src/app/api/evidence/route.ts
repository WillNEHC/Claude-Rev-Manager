import { handleEvidence } from "../../../api/handlers";
import { dashboardRepo } from "../../lib/server";
import { queryParams, json } from "../../lib/respond";

export async function GET(req: Request): Promise<Response> {
  return json(await handleEvidence(dashboardRepo(), queryParams(req.url)));
}
