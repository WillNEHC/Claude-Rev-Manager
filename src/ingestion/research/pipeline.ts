import type { IngestRepository, CrawlRunCounts } from "../../lib/db/repository";
import type { SearchProvider } from "./provider";
import type { MarketConfig } from "../types";
import { gatherMarketReviews, type GatherOptions } from "./gatherer";
import { reviewContentHash } from "../../lib/hash";
import type { Logger } from "../../lib/logging";
import { logger as rootLogger } from "../../lib/logging";

/**
 * Web-research ingestion (ToS-clean, docs/16). Gathers public market-level
 * documents and inserts them as listing-less reviews, deduplicated by content
 * hash exactly like listing reviews. Idempotent: re-running adds only genuinely
 * new public content.
 */
export interface RunWebResearchInput {
  marketId: string;
  market: MarketConfig;
  provider: SearchProvider;
  repo: IngestRepository;
  gather?: GatherOptions;
  logger?: Logger;
}

export interface RunWebResearchResult extends CrawlRunCounts {
  runId: string;
}

export async function runWebResearch(input: RunWebResearchInput): Promise<RunWebResearchResult> {
  const runId = await input.repo.startCrawlRun({ marketId: input.marketId, source: "other" });
  const log = (input.logger ?? rootLogger).child({ runId, market: input.market.slug, source: "web-research" });

  const counts: CrawlRunCounts = { pagesFetched: 0, reviewsFound: 0, reviewsNew: 0 };
  try {
    const reviews = await gatherMarketReviews(input.market, input.provider, input.gather);
    counts.pagesFetched = reviews.length;
    counts.reviewsFound = reviews.length;

    for (const review of reviews) {
      const contentHash = reviewContentHash({
        source: review.source,
        author_name: review.authorName,
        review_date: review.reviewDate,
        body: review.body,
      });
      const inserted = await input.repo.insertReviewIfNew({
        marketId: input.marketId,
        listingId: null, // market-level evidence, not tied to a listing
        hostId: null,
        source: review.source,
        sourceReviewId: review.sourceReviewId,
        contentHash,
        authorName: review.authorName,
        reviewDate: review.reviewDate,
        rating: review.rating,
        language: review.language,
        body: review.body,
      });
      if (inserted) counts.reviewsNew += 1;
    }

    await input.repo.finishCrawlRun(runId, { status: "succeeded", counts });
    log.info(counts, "web research complete");
    return { runId, ...counts };
  } catch (err) {
    await input.repo.finishCrawlRun(runId, { status: "failed", counts, error: String(err) });
    log.error({ err: String(err) }, "web research failed");
    return { runId, ...counts };
  }
}
