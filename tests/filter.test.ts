import { describe, it, expect } from "vitest";
import { deriveFlags, applyFilter } from "../src/ingestion/filter";
import type { CandidateListing } from "../src/ingestion/types";
import { discoveryProfileSchema } from "../src/lib/config/schema";

const profile = discoveryProfileSchema.parse({
  match_mode: "most",
  required: { entire_home: true },
  preferred: { luxury: true, family_oriented: true, pet_friendly: true, superhost: true },
  preferred_threshold: 0.5,
  heuristics: {
    luxury: { min_nightly_rate_usd: 400, keywords: ["luxury", "estate"] },
    family_oriented: { min_bedrooms: 3, keywords: ["family"] },
    pet_friendly: { amenity_flags: ["dog", "pets"] },
    superhost: { require_badge: true },
  },
});

const luxuryFamilyPetSuperhost: CandidateListing = {
  platform: "airbnb",
  platformListingId: "1",
  url: "https://airbnb.com/rooms/1",
  title: "Luxury Lakefront Estate",
  propertyType: "Entire home",
  bedrooms: 4,
  nightlyRateUsd: 750,
  isSuperhost: true,
  amenities: ["Dog friendly", "Fast wifi"],
  descriptionText: "luxury estate family lakefront dog friendly",
};

describe("discovery filtering", () => {
  it("derives all five criterion flags", () => {
    const flags = deriveFlags(luxuryFamilyPetSuperhost, profile);
    expect(flags).toEqual({
      isEntireHome: true,
      isLuxury: true,
      isFamilyOriented: true,
      isPetFriendly: true,
      isSuperhost: true,
    });
  });

  it("includes a listing meeting required + enough preferred (match_mode=most)", () => {
    const res = applyFilter(luxuryFamilyPetSuperhost, profile);
    expect(res.included).toBe(true);
  });

  it("excludes when the required criterion fails", () => {
    const room: CandidateListing = {
      ...luxuryFamilyPetSuperhost,
      propertyType: "Private room",
    };
    const res = applyFilter(room, profile);
    expect(res.included).toBe(false);
    expect(res.reasons.join(" ")).toContain("entire_home");
  });

  it("excludes when too few preferred are met under match_mode=most", () => {
    const sparse: CandidateListing = {
      platform: "airbnb",
      platformListingId: "2",
      url: "https://airbnb.com/rooms/2",
      title: "Basic cabin",
      propertyType: "Entire home",
      bedrooms: 1,
      nightlyRateUsd: 120,
      isSuperhost: false,
      amenities: [],
      descriptionText: "basic cabin",
    };
    const res = applyFilter(sparse, profile);
    expect(res.included).toBe(false);
  });

  it("match_mode=all requires every preferred criterion", () => {
    const allProfile = discoveryProfileSchema.parse({
      ...profile,
      match_mode: "all",
    });
    // Missing pet-friendly amenity -> not all preferred met.
    const noPet: CandidateListing = { ...luxuryFamilyPetSuperhost, amenities: ["Fast wifi"] };
    expect(applyFilter(noPet, allProfile).included).toBe(false);
    expect(applyFilter(luxuryFamilyPetSuperhost, allProfile).included).toBe(true);
  });
});
