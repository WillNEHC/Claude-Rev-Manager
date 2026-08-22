/**
 * extract — process the unprocessed-review queue into review_extractions +
 * mention tables. Invalid model outputs are quarantined (extraction_failures),
 * never written. Idempotent: only reviews with is_processed=false are touched.
 *
 * Usage: npm run extract -- [limit]
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 */
import { createServiceClient } from "../lib/db/client";
import { SupabaseExtractionRepository } from "../lib/db/supabase-extraction-repository";
import { AnthropicExtractor } from "../ai/extract";
import { runExtraction } from "../ai/pipeline";
import { logger } from "../lib/logging";

async function main(): Promise<void> {
  const limit = Number(process.argv[2] ?? 200);
  const repo = new SupabaseExtractionRepository(createServiceClient());
  const extractor = new AnthropicExtractor({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  const result = await runExtraction({ repo, extractor, limit, logger });
  logger.info(result, "extract job finished");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

main().catch((err) => {
  logger.error({ err: String(err) }, "extract failed");
  process.exitCode = 1;
});
