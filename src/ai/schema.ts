import { z } from "zod";

/**
 * Runtime validation contract for AI extraction. Mirrors
 * docs/schemas/review-extraction.schema.json and the review_extractions +
 * mention tables. Every model output is validated against this before anything
 * is written; invalid outputs are quarantined, never persisted (docs/05).
 *
 * Ranges (sentiment_score -1..1, confidence 0..1, severity 1..5) are enforced
 * here in code rather than in the JSON schema, since structured-output JSON
 * schemas don't support numeric bounds.
 */

export const sentimentEnum = z.enum([
  "very_negative",
  "negative",
  "neutral",
  "positive",
  "very_positive",
]);
export type Sentiment = z.infer<typeof sentimentEnum>;

const unit = z.number().min(0).max(1); // confidence 0..1
const signed = z.number().min(-1).max(1); // scores -1..1

export const amenityMentionSchema = z.object({
  amenity_slug: z.string().min(1),
  sentiment: sentimentEnum,
  is_positive: z.boolean(),
  is_negative: z.boolean(),
  excerpt: z.string(),
  confidence: unit,
});

export const categoryMentionSchema = z.object({
  category_slug: z.string().min(1),
  sentiment: sentimentEnum,
  confidence: unit,
  excerpt: z.string(),
});

export const personaMentionSchema = z.object({
  persona_slug: z.string().min(1),
  is_emergent: z.boolean(),
  confidence: unit,
  excerpt: z.string(),
});

export const operationalIssueSchema = z.object({
  issue_type: z.string().min(1),
  category_slug: z.string().nullable(),
  severity: z.number().int().min(1).max(5),
  excerpt: z.string(),
  confidence: unit,
});

export const guestDelighterSchema = z.object({
  delighter_type: z.string().min(1),
  amenity_slug: z.string().nullable(),
  excerpt: z.string(),
  confidence: unit,
});

export const placeMentionSchema = z.object({
  raw_name: z.string().min(1),
  place_type: z.enum([
    "restaurant",
    "coffee",
    "brewery",
    "attraction",
    "event",
    "wedding_venue",
    "other",
  ]),
  sentiment: sentimentEnum,
  excerpt: z.string(),
  confidence: unit,
});

export const reviewExtractionSchema = z.object({
  trip_purpose: z.string().nullable(),
  reasons_for_booking: z.array(z.string()),
  reasons_to_return: z.array(z.string()),
  reasons_not_to_return: z.array(z.string()),

  sentiment: sentimentEnum.nullable(),
  sentiment_score: signed.nullable(),
  cleanliness_score: signed.nullable(),
  communication_score: signed.nullable(),
  checkin_score: signed.nullable(),
  value_score: signed.nullable(),

  has_operational_issue: z.boolean(),
  has_maintenance_issue: z.boolean(),
  has_unexpected_delight: z.boolean(),
  is_exceptional: z.boolean(),
  is_disappointment: z.boolean(),

  memorable_moments: z.array(z.string()),
  exceptional_phrases: z.array(z.string()),
  disappointment_phrases: z.array(z.string()),
  hidden_gems: z.array(z.string()),

  amenity_mentions: z.array(amenityMentionSchema),
  categories: z.array(categoryMentionSchema),
  personas: z.array(personaMentionSchema),
  operational_issues: z.array(operationalIssueSchema),
  guest_delighters: z.array(guestDelighterSchema),
  place_mentions: z.array(placeMentionSchema),

  extraction_confidence: unit,
});

export type ReviewExtraction = z.infer<typeof reviewExtractionSchema>;
export type AmenityMention = z.infer<typeof amenityMentionSchema>;
export type PersonaMention = z.infer<typeof personaMentionSchema>;
export type PlaceMention = z.infer<typeof placeMentionSchema>;

export interface ValidationOk {
  ok: true;
  data: ReviewExtraction;
}
export interface ValidationErr {
  ok: false;
  error: string;
}

/** Validate raw model output. Never throws; returns a discriminated result. */
export function validateExtraction(raw: unknown): ValidationOk | ValidationErr {
  const parsed = reviewExtractionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const error = parsed.error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  return { ok: false, error };
}
