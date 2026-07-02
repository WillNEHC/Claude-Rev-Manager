import { handleCompare } from "../../../api/handlers";
import { dashboardRepo } from "../../lib/server";
import { json } from "../../lib/respond";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return json(await handleCompare(dashboardRepo()));
}
