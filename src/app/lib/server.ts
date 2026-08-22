import "server-only";
import { createServiceClient } from "../../lib/db/client";
import { SupabaseDashboardRepository } from "../../lib/db/supabase-dashboard-repository";
import { SupabaseRetriever } from "../../lib/db/supabase-retriever";
import { AnthropicSynthesizer } from "../../rag/synthesize";
import { OpenAIEmbeddingProvider } from "../../ai/embed";

/**
 * Server-side factories for the dashboard. All reads use the service client
 * (server only). Never import this from a client component.
 */
export function dashboardRepo(): SupabaseDashboardRepository {
  return new SupabaseDashboardRepository(createServiceClient());
}

export function ragDeps() {
  const db = createServiceClient();
  const embedder = new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY ?? "" });
  return {
    retriever: new SupabaseRetriever(db, embedder),
    synthesizer: new AnthropicSynthesizer({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" }),
  };
}
