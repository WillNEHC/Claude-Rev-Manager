import type { RetrievedChunk, StructuredRow, QuestionFilters } from "./types";

/**
 * Retrieval boundary. `semanticSearch` embeds the question and pulls the most
 * similar review chunks (match_reviews); the structured helpers answer
 * aggregation questions from the engine tables. The Supabase implementation does
 * both; the in-memory fake returns fixtures so the RAG pipeline is testable
 * without a database, embeddings, or an LLM.
 */
export interface Retriever {
  semanticSearch(input: {
    question: string;
    marketId?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<RetrievedChunk[]>;

  structured(input: {
    question: string;
    filters: QuestionFilters;
    limit?: number;
  }): Promise<StructuredRow[]>;

  /** Resolve a market slug to its id (for scoping semantic search). */
  resolveMarketId(slug: string): Promise<string | null>;
}

export class InMemoryRetriever implements Retriever {
  constructor(
    private readonly data: {
      chunks: RetrievedChunk[];
      structured?: StructuredRow[];
      markets?: Record<string, string>; // slug -> id
    },
  ) {}

  async semanticSearch(input: { marketId?: string; limit?: number; minSimilarity?: number }): Promise<RetrievedChunk[]> {
    const min = input.minSimilarity ?? 0;
    return this.data.chunks
      .filter((c) => (input.marketId ? c.marketId === input.marketId : true))
      .filter((c) => c.similarity >= min)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, input.limit ?? 20);
  }

  async structured(): Promise<StructuredRow[]> {
    return this.data.structured ?? [];
  }

  async resolveMarketId(slug: string): Promise<string | null> {
    return this.data.markets?.[slug] ?? null;
  }
}
