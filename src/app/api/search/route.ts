import { handleSearch } from "../../../api/search-handler";
import { ragDeps } from "../../lib/server";
import { json } from "../../lib/respond";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  return json(await handleSearch(ragDeps(), body));
}
