import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExtractionRepository,
  EmbeddingRepository,
  UnprocessedReview,
  UnembeddedReview,
  EmbeddingChunk,
} from "./extraction-repository";
import type { ReviewExtraction } from "../../ai/schema";

/**
 * Supabase-backed extraction + embedding repository. Resolves extraction slugs
 * to dimension ids (creating amenities / emergent personas as needed), writes
 * review_extractions + the mention fan-out, then flips is_processed last so a
 * mid-write failure leaves the review eligible for retry rather than half-written.
 *
 * NOTE: cross-call atomicity is best-effort (PostgREST calls aren't one
 * transaction). A production hardening moves persistExtraction into a single
 * Postgres RPC; the write-order here keeps the store consistent in the meantime.
 */
export class SupabaseExtractionRepository
  implements ExtractionRepository, EmbeddingRepository
{
  constructor(private readonly db: SupabaseClient) {}

  async getUnprocessedReviews(limit: number): Promise<UnprocessedReview[]> {
    const { data, error } = await this.db
      .from("reviews")
      .select("id, market_id, listing_id, host_id, source, body, rating, review_date, markets(name), listings(title)")
      .eq("is_processed", false)
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const market = row.markets as { name?: string } | null;
      const listing = row.listings as { title?: string } | null;
      return {
        id: row.id as string,
        marketId: row.market_id as string,
        listingId: (row.listing_id as string) ?? null,
        hostId: (row.host_id as string) ?? null,
        source: row.source as string,
        body: row.body as string,
        rating: (row.rating as number) ?? null,
        reviewDate: (row.review_date as string) ?? null,
        marketName: market?.name,
        listingTitle: listing?.title,
      };
    });
  }

  async persistExtraction(input: {
    review: UnprocessedReview;
    extraction: ReviewExtraction;
    model: string;
  }): Promise<void> {
    const { review, extraction, model } = input;

    // 1. review_extractions (scalars + arrays + raw)
    const { error: exErr } = await this.db.from("review_extractions").upsert(
      {
        review_id: review.id,
        model,
        schema_version: 1,
        trip_purpose: extraction.trip_purpose,
        reasons_for_booking: extraction.reasons_for_booking,
        reasons_to_return: extraction.reasons_to_return,
        reasons_not_to_return: extraction.reasons_not_to_return,
        sentiment: extraction.sentiment,
        sentiment_score: extraction.sentiment_score,
        cleanliness_score: extraction.cleanliness_score,
        communication_score: extraction.communication_score,
        checkin_score: extraction.checkin_score,
        value_score: extraction.value_score,
        has_operational_issue: extraction.has_operational_issue,
        has_maintenance_issue: extraction.has_maintenance_issue,
        has_unexpected_delight: extraction.has_unexpected_delight,
        is_exceptional: extraction.is_exceptional,
        is_disappointment: extraction.is_disappointment,
        memorable_moments: extraction.memorable_moments,
        exceptional_phrases: extraction.exceptional_phrases,
        disappointment_phrases: extraction.disappointment_phrases,
        hidden_gems: extraction.hidden_gems,
        extraction_confidence: extraction.extraction_confidence,
        raw: extraction,
      },
      { onConflict: "review_id" },
    );
    if (exErr) throw exErr;

    // 2. amenity mentions (resolve/create amenities by slug)
    for (const m of extraction.amenity_mentions) {
      const amenityId = await this.resolveAmenityId(m.amenity_slug);
      await this.db.from("amenity_mentions").upsert(
        {
          review_id: review.id,
          amenity_id: amenityId,
          sentiment: m.sentiment,
          is_positive: m.is_positive,
          is_negative: m.is_negative,
          excerpt: m.excerpt,
          confidence: m.confidence,
        },
        { onConflict: "review_id,amenity_id" },
      );
    }

    // 3. category classifications (fixed taxonomy — skip unknown slugs)
    for (const c of extraction.categories) {
      const categoryId = await this.resolveCategoryId(c.category_slug);
      if (!categoryId) continue;
      await this.db.from("review_categories").upsert(
        { review_id: review.id, category_id: categoryId, sentiment: c.sentiment, confidence: c.confidence, excerpt: c.excerpt },
        { onConflict: "review_id,category_id" },
      );
    }

    // 4. persona classifications (create emergent personas unconfirmed)
    for (const p of extraction.personas) {
      const personaId = await this.resolvePersonaId(p.persona_slug, p.is_emergent);
      await this.db.from("review_personas").upsert(
        { review_id: review.id, persona_id: personaId, confidence: p.confidence, excerpt: p.excerpt },
        { onConflict: "review_id,persona_id" },
      );
    }

    // 5. operational issues
    for (const o of extraction.operational_issues) {
      const categoryId = o.category_slug ? await this.resolveCategoryId(o.category_slug) : null;
      await this.db.from("operational_issues").insert({
        review_id: review.id,
        category_id: categoryId,
        issue_type: o.issue_type,
        severity: o.severity,
        excerpt: o.excerpt,
        confidence: o.confidence,
      });
    }

    // 6. guest delighters
    for (const g of extraction.guest_delighters) {
      const amenityId = g.amenity_slug ? await this.resolveAmenityId(g.amenity_slug) : null;
      await this.db.from("guest_delighters").insert({
        review_id: review.id,
        delighter_type: g.delighter_type,
        amenity_id: amenityId,
        excerpt: g.excerpt,
        confidence: g.confidence,
      });
    }

    // 7. place mentions (resolve/create local_businesses)
    for (const pl of extraction.place_mentions) {
      const businessId = await this.resolveLocalBusinessId(review, pl.raw_name, pl.place_type);
      await this.db.from("place_mentions").insert({
        review_id: review.id,
        local_business_id: businessId,
        raw_name: pl.raw_name,
        place_type: pl.place_type,
        sentiment: pl.sentiment,
        excerpt: pl.excerpt,
        confidence: pl.confidence,
      });
    }

    // 8. flip is_processed LAST, and resolve any prior quarantine.
    const { error: upErr } = await this.db
      .from("reviews")
      .update({ is_processed: true, processed_at: new Date().toISOString() })
      .eq("id", review.id);
    if (upErr) throw upErr;
    await this.db.from("extraction_failures").update({ resolved: true }).eq("review_id", review.id);
  }

  async recordExtractionFailure(input: { reviewId: string; error: string; raw: unknown }): Promise<void> {
    const { data: existing } = await this.db
      .from("extraction_failures")
      .select("attempts")
      .eq("review_id", input.reviewId)
      .maybeSingle();
    const attempts = ((existing?.attempts as number) ?? 0) + 1;
    await this.db.from("extraction_failures").upsert(
      {
        review_id: input.reviewId,
        error: input.error,
        raw: input.raw ?? null,
        attempts,
        last_seen_at: new Date().toISOString(),
        resolved: false,
      },
      { onConflict: "review_id" },
    );
  }

  async getUnembeddedReviews(limit: number): Promise<UnembeddedReview[]> {
    const { data, error } = await this.db
      .from("reviews_needing_embedding")
      .select("id, market_id, body")
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { id: row.id as string, marketId: row.market_id as string, body: row.body as string };
    });
  }

  async saveReviewEmbeddings(input: {
    reviewId: string;
    marketId: string;
    model: string;
    chunks: EmbeddingChunk[];
  }): Promise<void> {
    if (input.chunks.length === 0) return;
    const rows = input.chunks.map((c) => ({
      review_id: input.reviewId,
      market_id: input.marketId,
      chunk_index: c.index,
      content: c.content,
      embedding: toVectorLiteral(c.embedding),
      model: input.model,
    }));
    const { error } = await this.db
      .from("review_embeddings")
      .upsert(rows, { onConflict: "review_id,chunk_index" });
    if (error) throw error;
  }

  /* --- slug resolution ---------------------------------------------------- */

  private async resolveAmenityId(slug: string): Promise<string> {
    const { data, error } = await this.db
      .from("amenities")
      .upsert({ slug, name: slugToName(slug) }, { onConflict: "slug", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) return data[0]!.id as string;
    const found = await this.db.from("amenities").select("id").eq("slug", slug).single();
    if (found.error) throw found.error;
    return found.data.id as string;
  }

  private async resolvePersonaId(slug: string, isEmergent: boolean): Promise<string> {
    const { data, error } = await this.db
      .from("traveler_personas")
      .upsert(
        { slug, name: slugToName(slug), is_seed: false, is_confirmed: !isEmergent },
        { onConflict: "slug", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) return data[0]!.id as string;
    const found = await this.db.from("traveler_personas").select("id").eq("slug", slug).single();
    if (found.error) throw found.error;
    return found.data.id as string;
  }

  private async resolveCategoryId(slug: string): Promise<string | null> {
    const { data } = await this.db.from("categories").select("id").eq("slug", slug).maybeSingle();
    return (data?.id as string) ?? null;
  }

  private async resolveLocalBusinessId(
    review: UnprocessedReview,
    name: string,
    placeType: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("local_businesses")
      .upsert(
        { market_id: review.marketId, name, place_type: placeType },
        { onConflict: "market_id,name,place_type", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) return data[0]!.id as string;
    const found = await this.db
      .from("local_businesses")
      .select("id")
      .eq("market_id", review.marketId)
      .eq("name", name)
      .eq("place_type", placeType)
      .maybeSingle();
    return (found.data?.id as string) ?? null;
  }
}

function slugToName(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** pgvector accepts a bracketed numeric literal string via PostgREST. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
