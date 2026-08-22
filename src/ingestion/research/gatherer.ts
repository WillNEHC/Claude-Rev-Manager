import type { SearchProvider, ResearchDoc } from "./provider";
import { classifySource } from "./provider";
import type { RawReview, MarketConfig } from "../types";

/**
 * Turn public web documents into market-level review evidence. Each qualifying
 * document becomes a RawReview (source classified by domain, listing-less) that
 * the same AI extraction pipeline analyzes for amenities/personas/complaints/etc.
 * This is reading public pages for market research — no listing scraping.
 */

export interface GatherOptions {
  perQueryLimit?: number;
  minContentChars?: number;
  maxBodyChars?: number;
  extraQueries?: string[];
}

/** Default research angles for a market (guest wants, complaints, activities). */
export function marketQueries(market: MarketConfig): string[] {
  const name = market.name;
  return [
    `${name} vacation rental guest reviews what guests loved`,
    `${name} vacation rental reviews complaints what was missing`,
    `${name} what to do restaurants families reddit`,
    `${name} lakefront rental amenities guests want dock wifi pet friendly`,
  ];
}

export async function gatherMarketReviews(
  market: MarketConfig,
  provider: SearchProvider,
  opts: GatherOptions = {},
): Promise<RawReview[]> {
  const perQueryLimit = opts.perQueryLimit ?? 8;
  const minContentChars = opts.minContentChars ?? 200;
  const maxBodyChars = opts.maxBodyChars ?? 4000;
  const queries = [...marketQueries(market), ...(opts.extraQueries ?? [])];

  const seen = new Set<string>(); // dedup docs by URL within a run
  const reviews: RawReview[] = [];

  for (const query of queries) {
    let docs: ResearchDoc[] = [];
    try {
      docs = await provider.search(query, { limit: perQueryLimit });
    } catch {
      continue; // one failed query degrades that query, not the run
    }
    for (const doc of docs) {
      if (seen.has(doc.url)) continue;
      seen.add(doc.url);
      const body = doc.content.replace(/\s+/g, " ").trim();
      if (body.length < minContentChars) continue; // too thin to be useful evidence
      reviews.push({
        source: classifySource(doc.url),
        sourceReviewId: doc.url, // the page URL is a stable id for dedup context
        authorName: undefined,
        reviewDate: undefined,
        language: "en",
        body: body.slice(0, maxBodyChars),
      });
    }
  }
  return reviews;
}
