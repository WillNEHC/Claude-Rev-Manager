import { z } from "zod";

/**
 * Zod schemas mirroring config/markets.yaml and config/discovery-filters.yaml.
 * These are the single source of truth for config shape; loaders validate raw
 * YAML against them so a malformed config fails fast with a clear error rather
 * than surfacing as a mysterious runtime bug deep in the pipeline.
 */

export const SOURCES = [
  "airbnb",
  "vrbo",
  "booking",
  "google",
  "reddit",
  "forum",
  "blog",
  "destination_site",
  "other",
] as const;
export const sourceSchema = z.enum(SOURCES);
export type PlatformSource = z.infer<typeof sourceSchema>;

const centerSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const marketSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case (a-z, 0-9, -)"),
  name: z.string().min(1),
  center: centerSchema.optional(),
  radius_km: z.number().positive().optional(),
  search_terms: z.array(z.string()).default([]),
  towns: z.array(z.string()).default([]),
});
export type MarketConfig = z.infer<typeof marketSchema>;

export const marketsDefaultsSchema = z.object({
  region: z.string().default("New Hampshire"),
  history_window_months: z.number().int().positive().default(12),
  sources: z.array(sourceSchema).default(["airbnb"]),
  discovery_filters_ref: z.string().default("default"),
});
export type MarketsDefaults = z.infer<typeof marketsDefaultsSchema>;

export const marketsFileSchema = z.object({
  defaults: marketsDefaultsSchema.default({}),
  markets: z.array(marketSchema).min(1, "at least one market is required"),
});
export type MarketsFile = z.infer<typeof marketsFileSchema>;

/* --- Discovery filters --------------------------------------------------- */

export const matchModeSchema = z.enum(["all", "most", "any"]);

const luxuryHeuristic = z.object({
  min_nightly_rate_usd: z.number().nonnegative().optional(),
  keywords: z.array(z.string()).default([]),
});
const familyHeuristic = z.object({
  min_bedrooms: z.number().int().nonnegative().optional(),
  keywords: z.array(z.string()).default([]),
});
const petHeuristic = z.object({
  amenity_flags: z.array(z.string()).default([]),
});
const superhostHeuristic = z.object({
  require_badge: z.boolean().default(true),
});

export const discoveryProfileSchema = z.object({
  match_mode: matchModeSchema.default("most"),
  required: z.record(z.boolean()).default({}),
  preferred: z.record(z.boolean()).default({}),
  preferred_threshold: z.number().min(0).max(1).default(0.5),
  heuristics: z
    .object({
      luxury: luxuryHeuristic.optional(),
      family_oriented: familyHeuristic.optional(),
      pet_friendly: petHeuristic.optional(),
      superhost: superhostHeuristic.optional(),
    })
    .default({}),
});
export type DiscoveryProfile = z.infer<typeof discoveryProfileSchema>;

export const discoveryFiltersFileSchema = z.object({
  profiles: z.record(discoveryProfileSchema).refine((p) => "default" in p, {
    message: "a 'default' profile is required",
  }),
});
export type DiscoveryFiltersFile = z.infer<typeof discoveryFiltersFileSchema>;
