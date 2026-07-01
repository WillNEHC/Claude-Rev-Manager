/**
 * embed — chunk + embed reviews that have no embeddings yet, into
 * review_embeddings (pgvector) for RAG. Idempotent via the
 * reviews_needing_embedding queue view.
 *
 * Usage: npm run embed -- [limit]
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
 */
import { createServiceClient } from "../lib/db/client";
import { SupabaseExtractionRepository } from "../lib/db/supabase-extraction-repository";
import { OpenAIEmbeddingProvider } from "../ai/embed";
import { runEmbedding } from "../ai/pipeline";
import { logger } from "../lib/logging";

async function main(): Promise<void> {
  const limit = Number(process.argv[2] ?? 200);
  const repo = new SupabaseExtractionRepository(createServiceClient());
  const embedder = new OpenAIEmbeddingProvider({ apiKey: requireEnv("OPENAI_API_KEY") });
  const result = await runEmbedding({ repo, embedder, limit, logger });
  logger.info(result, "embed job finished");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

main().catch((err) => {
  logger.error({ err: String(err) }, "embed failed");
  process.exitCode = 1;
});
