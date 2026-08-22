/**
 * Extraction prompt construction. The system prompt is a stable prefix (cacheable
 * — see docs/12) that defines the task, the taxonomy hints, and the JSON-only
 * output contract; the review text is the volatile per-call suffix.
 */

export interface ExtractionInput {
  body: string;
  source: string;
  marketName?: string;
  listingTitle?: string;
  rating?: number | null;
  reviewDate?: string | null;
}

/** Seed slugs the model should prefer so extractions align with the taxonomy. */
export const SEED_CATEGORY_SLUGS = [
  "amenities", "guest_experience", "host", "communication", "cleanliness",
  "design", "outdoor_experience", "location", "restaurants", "activities",
  "events", "maintenance", "parking", "technology", "value",
  "family_experience", "luxury", "accessibility", "pets", "dock", "lake_access", "beach",
];

export const SEED_PERSONA_SLUGS = [
  "families", "couples", "wedding_guests", "luxury_travelers", "pet_owners",
  "remote_workers", "business_travelers", "fishing_groups", "boating_groups",
  "friends_trips", "multigen_families", "seasonal_visitors",
];

export function buildSystemPrompt(): string {
  return [
    "You are an expert analyst extracting structured signal from short-term-rental guest reviews for a luxury New Hampshire lake market.",
    "Extract ONLY what the review actually states or clearly implies. Do not invent details. Absence of a signal is itself signal — omit what isn't there (empty arrays, null scalars).",
    "Every excerpt you include MUST be a verbatim (or near-verbatim) quote from the review — it is used as cited evidence.",
    "Scores are signed -1..1; confidence values are 0..1; severity is an integer 1..5.",
    "",
    "Classify categories using these known slugs when they fit (create a new slug only if none applies):",
    SEED_CATEGORY_SLUGS.join(", "),
    "",
    "Assign traveler personas using these known slugs when they fit; if a clearly-supported persona is not listed, propose a new snake_case slug and set is_emergent=true:",
    SEED_PERSONA_SLUGS.join(", "),
    "",
    "Amenity, delighter, and place slugs are snake_case (e.g. fire_pit, private_dock, welcome_basket).",
    "Respond with a SINGLE JSON object matching the required schema and nothing else — no markdown, no prose, no code fences.",
  ].join("\n");
}

export function buildUserPrompt(input: ExtractionInput): string {
  const meta = [
    input.marketName ? `Market: ${input.marketName}` : null,
    input.listingTitle ? `Listing: ${input.listingTitle}` : null,
    input.rating != null ? `Star rating: ${input.rating}` : null,
    input.reviewDate ? `Date: ${input.reviewDate}` : null,
    `Source: ${input.source}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${meta}\n\nReview:\n"""\n${input.body}\n"""`;
}
