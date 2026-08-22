-- =============================================================================
-- GDIP Migration 0007 — Analytics Aggregation Functions
--
-- The intelligence engines consume per-market amenity/category signal for a
-- period. Aggregation is done in SQL (fast, set-based) and exposed as functions
-- the Supabase analytics source calls via RPC. Period metrics for the trend
-- engine are derived from these in the app layer, so no third function is needed.
--
-- Evidence: each row returns up to 3 supporting excerpts (text[]) so downstream
-- conclusions can cite guest voice without a second query.
-- =============================================================================

-- Per-market amenity signal for the month starting p_month.
create or replace function amenity_stats(p_month date)
returns table (
  market_id uuid,
  amenity_slug text,
  amenity_id uuid,
  reviews_in_period bigint,
  mentions bigint,
  positive bigint,
  negative bigint,
  delighter_cooccur bigint,
  evidence text[]
)
language sql stable as $$
  with period as (
    select r.id as review_id, r.market_id
    from reviews r
    where r.review_date >= p_month
      and r.review_date < (p_month + interval '1 month')
  ),
  market_reviews as (
    select market_id, count(*)::bigint as cnt from period group by market_id
  ),
  am as (
    select p.market_id,
           a.slug,
           a.id as amenity_id,
           m.review_id,
           m.is_positive,
           m.is_negative,
           m.excerpt,
           (exists (select 1 from guest_delighters gd where gd.review_id = m.review_id)
             or coalesce((select re.is_exceptional from review_extractions re where re.review_id = m.review_id), false)
           ) as delight
    from amenity_mentions m
    join period p on p.review_id = m.review_id
    join amenities a on a.id = m.amenity_id
  )
  select am.market_id,
         am.slug,
         am.amenity_id,
         mr.cnt as reviews_in_period,
         count(*)::bigint as mentions,
         count(*) filter (where am.is_positive)::bigint as positive,
         count(*) filter (where am.is_negative)::bigint as negative,
         count(*) filter (where am.delight)::bigint as delighter_cooccur,
         (array_agg(am.excerpt) filter (where am.excerpt is not null))[1:3] as evidence
  from am
  join market_reviews mr on mr.market_id = am.market_id
  group by am.market_id, am.slug, am.amenity_id, mr.cnt;
$$;

-- Per-market category signal for the month starting p_month.
create or replace function category_stats(p_month date)
returns table (
  market_id uuid,
  category_slug text,
  category_id uuid,
  mentions bigint,
  positive bigint,
  negative bigint,
  evidence text[]
)
language sql stable as $$
  with period as (
    select r.id as review_id, r.market_id
    from reviews r
    where r.review_date >= p_month
      and r.review_date < (p_month + interval '1 month')
  )
  select p.market_id,
         c.slug as category_slug,
         c.id as category_id,
         count(*)::bigint as mentions,
         count(*) filter (where rc.sentiment in ('positive','very_positive'))::bigint as positive,
         count(*) filter (where rc.sentiment in ('negative','very_negative'))::bigint as negative,
         (array_agg(rc.excerpt) filter (where rc.excerpt is not null))[1:3] as evidence
  from review_categories rc
  join period p on p.review_id = rc.review_id
  join categories c on c.id = rc.category_id
  group by p.market_id, c.slug, c.id;
$$;

-- Stable identity for month-over-month recommendation diffing (docs/06 history).
alter table recommendations add column if not exists rec_key text;
create index if not exists idx_recs_key on recommendations(rec_key, report_month);
