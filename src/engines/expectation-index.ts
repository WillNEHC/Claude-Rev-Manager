import type { AmenityStat, AmenityClassification } from "./types";

/**
 * Guest Expectation Index: classify amenities as table_stakes vs delight from
 * data (docs/06). Signature:
 *   - table_stakes: high prevalence, complaints when absent, rarely praised.
 *   - delight: disproportionate praise + co-occurrence with memorable moments.
 * Below the sample floor, an amenity stays `unknown` with low confidence — we do
 * not classify on thin evidence (docs/11).
 */

export interface ExpectationOptions {
  minSample?: number; // mentions required before a confident classification
  delightThreshold?: number;
  stakesThreshold?: number;
}

export function classifyAmenities(
  stats: AmenityStat[],
  options: ExpectationOptions = {},
): AmenityClassification[] {
  const minSample = options.minSample ?? 5;
  const delightThreshold = options.delightThreshold ?? 0.55;
  const stakesThreshold = options.stakesThreshold ?? 0.5;

  // Aggregate stats per amenity across markets.
  const byAmenity = new Map<string, AmenityStat[]>();
  for (const s of stats) {
    const arr = byAmenity.get(s.amenitySlug) ?? [];
    arr.push(s);
    byAmenity.set(s.amenitySlug, arr);
  }

  const out: AmenityClassification[] = [];
  for (const [slug, group] of byAmenity) {
    const mentions = sum(group, (g) => g.mentions);
    const reviews = sum(group, (g) => g.reviewsInPeriod);
    const positive = sum(group, (g) => g.positive);
    const negative = sum(group, (g) => g.negative);
    const delighter = sum(group, (g) => g.delighterCooccur);

    const prevalence = reviews > 0 ? mentions / reviews : 0;
    const positiveRate = mentions > 0 ? positive / mentions : 0;
    const negativeRate = mentions > 0 ? negative / mentions : 0;
    const delighterRate = mentions > 0 ? delighter / mentions : 0;

    const delightScore = 0.5 * positiveRate + 0.5 * delighterRate;
    const stakesScore = 0.6 * negativeRate + 0.4 * prevalence;

    let classification: AmenityClassification["classification"] = "unknown";
    if (mentions >= minSample) {
      if (delightScore >= delightThreshold && delightScore > stakesScore) classification = "delight";
      else if (stakesScore >= stakesThreshold && stakesScore >= delightScore) classification = "table_stakes";
    }

    // Confidence: sample sufficiency × separation between the two signatures.
    const sampleFactor = Math.min(1, mentions / (minSample * 4));
    const separation = Math.min(1, Math.abs(delightScore - stakesScore) * 2);
    const confidence =
      classification === "unknown" ? round(0.25 * sampleFactor) : round(0.4 + 0.6 * sampleFactor * separation);

    out.push({
      amenitySlug: slug,
      amenityId: group.find((g) => g.amenityId)?.amenityId,
      classification,
      confidence,
      signals: {
        prevalence: round(prevalence),
        positiveRate: round(positiveRate),
        negativeRate: round(negativeRate),
        delighterRate: round(delighterRate),
      },
      evidence: group.flatMap((g) => g.evidence).slice(0, 5),
    });
  }
  return out;
}

function sum<T>(arr: T[], f: (t: T) => number): number {
  return arr.reduce((a, t) => a + f(t), 0);
}
function round(n: number): number {
  return Math.round(n * 1e3) / 1e3;
}
