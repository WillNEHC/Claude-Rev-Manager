/**
 * Natural-language search types (docs/07). Questions route to structured
 * retrieval (aggregations over engine tables), semantic retrieval (RAG over the
 * review corpus), or both. Every answer carries citations and a confidence, and
 * says "insufficient evidence" rather than guessing when retrieval is thin.
 */

export type Route = "structured" | "semantic" | "hybrid";

export interface QuestionFilters {
  marketSlug?: string;
  personaSlug?: string;
  categorySlug?: string;
  placeType?: string;
  direction?: "up" | "down";
}

export interface RoutedQuestion {
  route: Route;
  filters: QuestionFilters;
}

/** A review chunk retrieved semantically. */
export interface RetrievedChunk {
  reviewId: string;
  marketId: string;
  content: string;
  similarity: number;
}

/** A row from a structured aggregation (trend, place, recommendation…). */
export interface StructuredRow {
  kind: string; // 'place' | 'amenity_trend' | 'recommendation' | ...
  label: string;
  value: number | string;
  detail?: string;
}

export interface Citation {
  reviewId?: string;
  excerpt: string;
}

export interface SearchAnswer {
  question: string;
  route: Route;
  answer: string;
  confidence: number;
  supportingCount: number;
  citations: Citation[];
  structured: StructuredRow[];
  insufficientEvidence: boolean;
}
