import type { IngestRepository, CrawlRunCounts, CrawlStatus } from "../lib/db/repository";
import type { SourceAdapter, MarketConfig, QualifiedListing } from "./types";
import type { DiscoveryProfile } from "../lib/config/schema";
import { applyFilter } from "./filter";
import { reviewContentHash } from "../lib/hash";
import type { Logger } from "../lib/logging";
import { logger as rootLogger } from "../lib/logging";

/**
 * Orchestrates one crawl run: discover -> filter -> upsert listings/snapshots ->
 * fetch reviews -> dedup insert. Idempotent and resumable: re-running yields
 * reviews_new = 0 because dedup is enforced by content hash. Per-listing errors
 * degrade that listing (run ends 'partial'), they don't abort the run.
 */

export interface RunIngestionInput {
  marketId: string;
  market: MarketConfig;
  adapter: SourceAdapter;
  repo: IngestRepository;
  profile: DiscoveryProfile;
  historyWindowMonths: number;
  logger?: Logger;
  now?: () => Date;
}

export interface RunIngestionResult extends CrawlRunCounts {
  runId: string;
  status: CrawlStatus;
}

export async function runIngestion(input: RunIngestionInput): Promise<RunIngestionResult> {
  const now = input.now ?? (() => new Date());
  const runId = await input.repo.startCrawlRun({
    marketId: input.marketId,
    source: input.adapter.source,
  });
  const log = (input.logger ?? rootLogger).child({
    runId,
    market: input.market.slug,
    source: input.adapter.source,
  });

  const counts: CrawlRunCounts = { pagesFetched: 0, reviewsFound: 0, reviewsNew: 0 };
  let hadFailure = false;
  const since = monthsAgo(now(), input.historyWindowMonths);
  const snapshotMonth = firstOfMonth(now());

  try {
    const candidates = await input.adapter.discoverListings(input.market);
    counts.pagesFetched += candidates.length;
    log.info({ candidates: candidates.length }, "discovered candidate listings");

    for (const candidate of candidates) {
      const { included, flags, reasons } = applyFilter(candidate, input.profile);
      if (!included) {
        log.debug({ listing: candidate.platformListingId, reasons }, "listing skipped by filter");
        continue;
      }
      const qualified: QualifiedListing = { ...candidate, flags };

      try {
        const hostId = await input.repo.upsertHost({
          source: input.adapter.source,
          platformHostId: candidate.host?.platformHostId,
          displayName: candidate.host?.displayName,
          isSuperhost: flags.isSuperhost,
        });
        const listingId = await input.repo.upsertListing({
          marketId: input.marketId,
          hostId,
          listing: qualified,
        });

        const reviews = await input.adapter.fetchReviews(candidate, since);
        counts.reviewsFound += reviews.length;
        counts.pagesFetched += 1;

        let newForListing = 0;
        for (const review of reviews) {
          const contentHash = reviewContentHash({
            source: review.source,
            author_name: review.authorName,
            review_date: review.reviewDate,
            body: review.body,
          });
          const inserted = await input.repo.insertReviewIfNew({
            marketId: input.marketId,
            listingId,
            hostId,
            source: review.source,
            sourceReviewId: review.sourceReviewId,
            contentHash,
            authorName: review.authorName,
            reviewDate: review.reviewDate,
            rating: review.rating,
            language: review.language,
            body: review.body,
          });
          if (inserted) {
            counts.reviewsNew += 1;
            newForListing += 1;
          }
        }

        await input.repo.upsertSnapshot({
          marketId: input.marketId,
          listingId,
          snapshot: {
            snapshotMonth,
            nightlyRateUsd: candidate.nightlyRateUsd,
            ratingOverall: candidate.ratingOverall,
            reviewCount: candidate.reviewCount,
            newReviews: newForListing,
          },
        });
      } catch (err) {
        hadFailure = true;
        log.warn(
          { listing: candidate.platformListingId, err: String(err) },
          "listing failed; degrading and continuing",
        );
      }
    }

    const status: CrawlStatus = hadFailure ? "partial" : "succeeded";
    await input.repo.finishCrawlRun(runId, { status, counts });
    log.info({ ...counts, status }, "crawl run complete");
    return { runId, status, ...counts };
  } catch (err) {
    await input.repo.finishCrawlRun(runId, {
      status: "failed",
      counts,
      error: String(err),
    });
    log.error({ err: String(err) }, "crawl run failed");
    return { runId, status: "failed", ...counts };
  }
}

/* --- date helpers -------------------------------------------------------- */

export function firstOfMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function monthsAgo(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}
