import type { ReviewExtraction } from "../../ai/schema";

/**
 * Write surface for the AI extraction + embedding pipelines. As with ingestion,
 * an interface + in-memory fake lets us test the state machine (is_processed),
 * slug resolution, quarantine, and mention fan-out end to end; production uses
 * the Supabase-backed implementation.
 */

export interface UnprocessedReview {
  id: string;
  marketId: string;
  listingId: string | null;
  hostId: string | null;
  source: string;
  body: string;
  rating?: number | null;
  reviewDate?: string | null;
  marketName?: string;
  listingTitle?: string;
}

export interface UnembeddedReview {
  id: string;
  marketId: string;
  body: string;
}

export interface EmbeddingChunk {
  index: number;
  content: string;
  embedding: number[];
}

export interface ExtractionRepository {
  getUnprocessedReviews(limit: number): Promise<UnprocessedReview[]>;
  /** Resolve slugs, write review_extractions + mention rows, flip is_processed — atomically. */
  persistExtraction(input: {
    review: UnprocessedReview;
    extraction: ReviewExtraction;
    model: string;
  }): Promise<void>;
  /** Quarantine: record the failure; the review stays unprocessed for retry. */
  recordExtractionFailure(input: {
    reviewId: string;
    error: string;
    raw: unknown;
  }): Promise<void>;
}

export interface EmbeddingRepository {
  getUnembeddedReviews(limit: number): Promise<UnembeddedReview[]>;
  saveReviewEmbeddings(input: {
    reviewId: string;
    marketId: string;
    model: string;
    chunks: EmbeddingChunk[];
  }): Promise<void>;
}

/* --- In-memory implementation (tests) ------------------------------------ */

export class InMemoryExtractionRepository
  implements ExtractionRepository, EmbeddingRepository
{
  private reviews: UnprocessedReview[] = [];
  processed = new Set<string>();
  extractions = new Map<string, ReviewExtraction>();
  failures: { reviewId: string; error: string }[] = [];
  amenitiesSeen = new Set<string>();
  personasSeen = new Map<string, boolean>(); // slug -> isEmergent
  placesSeen = new Set<string>();
  mentionTotals = { amenities: 0, categories: 0, personas: 0, opsIssues: 0, delighters: 0, places: 0 };
  embeddings = new Map<string, EmbeddingChunk[]>();

  seed(reviews: UnprocessedReview[]): void {
    this.reviews.push(...reviews);
  }

  async getUnprocessedReviews(limit: number): Promise<UnprocessedReview[]> {
    return this.reviews.filter((r) => !this.processed.has(r.id)).slice(0, limit);
  }

  async persistExtraction(input: {
    review: UnprocessedReview;
    extraction: ReviewExtraction;
  }): Promise<void> {
    const { review, extraction } = input;
    this.extractions.set(review.id, extraction);
    this.processed.add(review.id);
    for (const a of extraction.amenity_mentions) this.amenitiesSeen.add(a.amenity_slug);
    for (const p of extraction.personas) this.personasSeen.set(p.persona_slug, p.is_emergent);
    for (const pl of extraction.place_mentions) this.placesSeen.add(pl.raw_name.toLowerCase());
    this.mentionTotals.amenities += extraction.amenity_mentions.length;
    this.mentionTotals.categories += extraction.categories.length;
    this.mentionTotals.personas += extraction.personas.length;
    this.mentionTotals.opsIssues += extraction.operational_issues.length;
    this.mentionTotals.delighters += extraction.guest_delighters.length;
    this.mentionTotals.places += extraction.place_mentions.length;
  }

  async recordExtractionFailure(input: { reviewId: string; error: string }): Promise<void> {
    this.failures.push({ reviewId: input.reviewId, error: input.error });
  }

  async getUnembeddedReviews(limit: number): Promise<UnembeddedReview[]> {
    return this.reviews
      .filter((r) => !this.embeddings.has(r.id))
      .slice(0, limit)
      .map((r) => ({ id: r.id, marketId: r.marketId, body: r.body }));
  }

  async saveReviewEmbeddings(input: {
    reviewId: string;
    chunks: EmbeddingChunk[];
  }): Promise<void> {
    this.embeddings.set(input.reviewId, input.chunks);
  }
}
