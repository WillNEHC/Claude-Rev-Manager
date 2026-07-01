import { validateExtraction } from "./schema";
import { chunkText, type EmbeddingProvider } from "./embed";
import type { LlmExtractor } from "./extract";
import type {
  ExtractionRepository,
  EmbeddingRepository,
} from "../lib/db/extraction-repository";
import type { Logger } from "../lib/logging";
import { logger as rootLogger } from "../lib/logging";

/**
 * Extraction pipeline. Pulls the unprocessed-review queue, extracts each via the
 * LLM, validates against the Zod contract, and either persists (flipping
 * is_processed) or quarantines. A model/validation failure degrades that review;
 * it never corrupts the store — invalid outputs are recorded, not written.
 */

export interface RunExtractionInput {
  repo: ExtractionRepository;
  extractor: LlmExtractor;
  limit?: number;
  logger?: Logger;
}
export interface RunExtractionResult {
  processed: number;
  failed: number;
}

export async function runExtraction(input: RunExtractionInput): Promise<RunExtractionResult> {
  const log = (input.logger ?? rootLogger).child({ job: "extract", model: input.extractor.model });
  const reviews = await input.repo.getUnprocessedReviews(input.limit ?? 100);
  const result: RunExtractionResult = { processed: 0, failed: 0 };
  log.info({ queued: reviews.length }, "extraction batch");

  for (const review of reviews) {
    try {
      const raw = await input.extractor.extractRaw({
        body: review.body,
        source: review.source,
        marketName: review.marketName,
        listingTitle: review.listingTitle,
        rating: review.rating,
        reviewDate: review.reviewDate,
      });
      const validated = validateExtraction(raw);
      if (!validated.ok) {
        await input.repo.recordExtractionFailure({ reviewId: review.id, error: validated.error, raw });
        result.failed += 1;
        log.warn({ reviewId: review.id, error: validated.error }, "extraction quarantined (invalid)");
        continue;
      }
      await input.repo.persistExtraction({
        review,
        extraction: validated.data,
        model: input.extractor.model,
      });
      result.processed += 1;
    } catch (err) {
      await input.repo.recordExtractionFailure({ reviewId: review.id, error: String(err), raw: null });
      result.failed += 1;
      log.warn({ reviewId: review.id, err: String(err) }, "extraction quarantined (error)");
    }
  }

  log.info(result, "extraction batch complete");
  return result;
}

/**
 * Embedding pipeline. Chunks each un-embedded review and stores per-chunk
 * vectors. Reviews with empty bodies are skipped.
 */
export interface RunEmbeddingInput {
  repo: EmbeddingRepository;
  embedder: EmbeddingProvider;
  limit?: number;
  maxChunkChars?: number;
  logger?: Logger;
}
export interface RunEmbeddingResult {
  embedded: number;
  chunks: number;
}

export async function runEmbedding(input: RunEmbeddingInput): Promise<RunEmbeddingResult> {
  const log = (input.logger ?? rootLogger).child({ job: "embed", model: input.embedder.model });
  const reviews = await input.repo.getUnembeddedReviews(input.limit ?? 200);
  const result: RunEmbeddingResult = { embedded: 0, chunks: 0 };

  for (const review of reviews) {
    const parts = chunkText(review.body, input.maxChunkChars);
    if (parts.length === 0) continue;
    const vectors = await input.embedder.embed(parts.map((p) => p.content));
    if (vectors.length !== parts.length) {
      log.warn({ reviewId: review.id }, "embedding count mismatch; skipping");
      continue;
    }
    await input.repo.saveReviewEmbeddings({
      reviewId: review.id,
      marketId: review.marketId,
      model: input.embedder.model,
      chunks: parts.map((p, i) => ({ index: p.index, content: p.content, embedding: vectors[i]! })),
    });
    result.embedded += 1;
    result.chunks += parts.length;
  }

  log.info(result, "embedding batch complete");
  return result;
}
