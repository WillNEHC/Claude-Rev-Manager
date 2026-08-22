-- =============================================================================
-- GDIP Migration 0008 — Performance & Maintenance (Phase 5 hardening)
--
-- Indexes for the hot dashboard/report read paths, a partial unique index that
-- makes market-level (listing_id null) snapshots idempotent, and a maintenance
-- function to rebuild the IVFFlat vector index as the corpus grows.
-- =============================================================================

-- Dashboard: recommendations list is filtered by market+status, ordered by priority.
create index if not exists idx_recs_market_status_priority
  on recommendations(market_id, status, priority_score desc);

-- Report build + history read by (market, report_month).
create index if not exists idx_recs_market_month
  on recommendations(market_id, report_month);

-- Opportunities list by market + status.
create index if not exists idx_opportunities_market_status
  on opportunities(market_id, status);

-- Market insights read by (market, type).
create index if not exists idx_market_insights_market_type
  on market_insights(market_id, insight_type);

-- Local-business "most mentioned" ranking.
create index if not exists idx_local_biz_mentions
  on local_businesses(market_id, place_type, mention_count desc);

-- Reviews-by-date is the aggregation window used by amenity_stats/category_stats.
create index if not exists idx_reviews_market_reviewdate
  on reviews(market_id, review_date);

-- Market-level snapshots (listing_id null) must be unique per (month, market).
-- The table's composite unique constraint treats NULLs as distinct, so add a
-- partial unique index to enforce one enrichment snapshot per market per month.
create unique index if not exists idx_market_snapshot_unique
  on monthly_snapshots(snapshot_month, market_id)
  where listing_id is null;

-- -----------------------------------------------------------------------------
-- IVFFlat maintenance. The vector index's recall depends on `lists`, which
-- should scale ~sqrt(rowcount). Rebuild periodically as the corpus grows
-- (call from a scheduled maintenance task). REINDEX is safe but locks briefly;
-- run during low-traffic windows.
-- -----------------------------------------------------------------------------
create or replace function reindex_review_embeddings()
returns void language plpgsql as $$
begin
  reindex index idx_review_embeddings_ann;
end $$;
