import type { HandlerResult } from "../../api/handlers";

/** Turn query-string params into a plain object for the Zod handlers. */
export function queryParams(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  return Object.fromEntries(params.entries());
}

/** Serialize a HandlerResult to a JSON Response with the right status. */
export function json<T>(result: HandlerResult<T>): Response {
  if (result.ok) return Response.json(result.data);
  return Response.json({ error: { code: "bad_request", message: result.error } }, { status: result.status });
}
