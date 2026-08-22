import type { CandidateListing, DiscoveryFlags } from "./types";
import type { DiscoveryProfile } from "../lib/config/schema";

/**
 * Discovery filtering (spec: entire homes, luxury, family, pet friendly,
 * superhost — configurable). Pure functions: derive the criterion flags from a
 * scraped listing via the profile's heuristics, then decide inclusion by the
 * profile's match_mode. No I/O, so this is exhaustively unit-testable.
 */

export interface FilterResult {
  included: boolean;
  flags: DiscoveryFlags;
  /** Human-readable reasons, logged for skipped listings. */
  reasons: string[];
}

/** Derive the five discovery-criterion booleans from scraped attributes. */
export function deriveFlags(
  listing: CandidateListing,
  profile: DiscoveryProfile,
): DiscoveryFlags {
  const h = profile.heuristics;
  const text = (listing.descriptionText ?? listing.title ?? "").toLowerCase();
  const amenities = (listing.amenities ?? []).map((a) => a.toLowerCase());

  const isEntireHome =
    listing.propertyType === undefined ||
    /entire|home|house|cabin|cottage|estate/i.test(listing.propertyType);

  const isLuxury = (() => {
    const rate = listing.nightlyRateUsd;
    const minRate = h.luxury?.min_nightly_rate_usd;
    const rateHit = minRate !== undefined && rate !== undefined && rate >= minRate;
    const kwHit = (h.luxury?.keywords ?? []).some((k) => text.includes(k.toLowerCase()));
    return rateHit || kwHit;
  })();

  const isFamilyOriented = (() => {
    const minBeds = h.family_oriented?.min_bedrooms;
    const bedsHit =
      minBeds !== undefined && listing.bedrooms !== undefined && listing.bedrooms >= minBeds;
    const kwHit = (h.family_oriented?.keywords ?? []).some((k) =>
      text.includes(k.toLowerCase()),
    );
    return bedsHit || kwHit;
  })();

  const isPetFriendly = (h.pet_friendly?.amenity_flags ?? []).some((flag) =>
    amenities.some((a) => a.includes(flag.toLowerCase())),
  );

  const isSuperhost = Boolean(listing.isSuperhost ?? listing.host?.isSuperhost);

  return { isEntireHome, isLuxury, isFamilyOriented, isPetFriendly, isSuperhost };
}

const FLAG_KEYS: Record<string, keyof DiscoveryFlags> = {
  entire_home: "isEntireHome",
  luxury: "isLuxury",
  family_oriented: "isFamilyOriented",
  pet_friendly: "isPetFriendly",
  superhost: "isSuperhost",
};

/** Apply a discovery profile to a candidate; decide inclusion + expose flags. */
export function applyFilter(
  listing: CandidateListing,
  profile: DiscoveryProfile,
): FilterResult {
  const flags = deriveFlags(listing, profile);
  const reasons: string[] = [];

  // Required criteria: every enabled one must be satisfied.
  const requiredKeys = Object.entries(profile.required)
    .filter(([, v]) => v)
    .map(([k]) => k);
  for (const key of requiredKeys) {
    const flagKey = FLAG_KEYS[key];
    if (flagKey && !flags[flagKey]) {
      reasons.push(`required '${key}' not met`);
    }
  }
  const requiredOk = reasons.length === 0;

  // Preferred criteria: satisfied fraction, compared to the profile threshold.
  const preferredKeys = Object.entries(profile.preferred)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const preferredMet = preferredKeys.filter((key) => {
    const flagKey = FLAG_KEYS[key];
    return flagKey ? flags[flagKey] : false;
  });
  const preferredFraction =
    preferredKeys.length === 0 ? 1 : preferredMet.length / preferredKeys.length;

  let included: boolean;
  switch (profile.match_mode) {
    case "all":
      included = requiredOk && preferredFraction >= 1;
      if (!included && requiredOk) reasons.push("match_mode=all: not all preferred met");
      break;
    case "any":
      included = requiredOk && (preferredKeys.length === 0 || preferredMet.length > 0);
      if (!included && requiredOk) reasons.push("match_mode=any: no preferred met");
      break;
    case "most":
    default:
      included = requiredOk && preferredFraction >= profile.preferred_threshold;
      if (!included && requiredOk) {
        reasons.push(
          `match_mode=most: preferred ${preferredFraction.toFixed(2)} < ${profile.preferred_threshold}`,
        );
      }
      break;
  }

  return { included, flags, reasons };
}
