-- =============================================================================
-- GDIP Migration 0003 — Local Places, Snapshots, Trends, Opportunities,
--                        Recommendations, Reports, and the Evidence spine.
--
-- Everything analytic in GDIP terminates in `evidence`: no recommendation,
-- insight, or trend point exists without rows that cite the underlying reviews.
-- =============================================================================

-- =============================================================================
-- LOCAL BUSINESSES — dimension for restaurants/breweries/attractions/events.
-- Sub-typed rather than duplicated into parallel tables; specialized fields
-- live in `details` jsonb + optional child tables for the few that need them.
-- =============================================================================
create table local_businesses (
  id            uuid primary key default gen_random_uuid(),
  market_id     uuid references markets(id) on delete set null,
  name          text not null,
  place_type    text not null,                          -- 'restaurant','brewery','coffee','attraction','event','wedding_venue'
  lat           double precision,
  lng           double precision,
  address       text,
  external_ids  jsonb not null default '{}'::jsonb,      -- google place id, etc.
  mention_count int not null default 0,
  avg_sentiment numeric(4,3),
  details       jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (market_id, name, place_type)
);
create trigger trg_local_biz_updated before update on local_businesses
  for each row execute function set_updated_at();
create index idx_local_biz_market_type on local_businesses(market_id, place_type);
create index idx_local_biz_name_trgm on local_businesses using gin (name gin_trgm_ops);

-- Now that local_businesses exists, wire the FK from place_mentions (0002).
alter table place_mentions
  add constraint fk_place_mentions_business
  foreign key (local_business_id) references local_businesses(id) on delete set null;

-- Convenience views spec calls out as "Restaurants / Events / Attractions".
create view restaurants as select * from local_businesses where place_type in ('restaurant','coffee','brewery');
create view attractions as select * from local_businesses where place_type = 'attraction';
create view events      as select * from local_businesses where place_type in ('event','wedding_venue');

-- =============================================================================
-- MONTHLY SNAPSHOTS — append-only point-in-time facts per listing & market.
-- The Trend engine diffs consecutive snapshots. Never updated in place.
-- =============================================================================
create table monthly_snapshots (
  id             uuid primary key default gen_random_uuid(),
  snapshot_month date not null,                          -- first-of-month key
  market_id      uuid not null references markets(id) on delete cascade,
  listing_id     uuid references listings(id) on delete cascade,  -- null = market-level
  nightly_rate_usd numeric(10,2),
  rating_overall numeric(3,2),
  review_count   int,
  new_reviews    int,
  occupancy_pct  numeric(5,2),                           -- optional (PriceLabs enrich)
  metrics        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (snapshot_month, market_id, listing_id)
);
create index idx_snapshots_market_month on monthly_snapshots(market_id, snapshot_month);

-- =============================================================================
-- TREND HISTORY — time series of any measured signal, per market/entity.
-- Emerging vs declining amenities, complaint trends, persona shifts, etc.
-- =============================================================================
create table trend_history (
  id            uuid primary key default gen_random_uuid(),
  market_id     uuid references markets(id) on delete cascade,
  metric_key    text not null,                           -- 'amenity.fire_pit.mention_rate'
  entity_type   text,                                    -- 'amenity','category','persona','place'
  entity_id     uuid,                                    -- soft ref to the entity
  period_start  date not null,
  period_grain  text not null default 'month',           -- 'month','season','year'
  value         numeric,
  prev_value    numeric,
  delta         numeric,                                 -- value - prev_value
  delta_pct     numeric,
  direction     text,                                    -- 'up','down','flat','new'
  sample_size   int,                                     -- supporting review count
  created_at    timestamptz not null default now(),
  unique (market_id, metric_key, period_start, period_grain)
);
create index idx_trend_market_metric on trend_history(market_id, metric_key, period_start desc);

-- =============================================================================
-- MARKET INSIGHTS — synthesized narrative findings per market (cross-review).
-- =============================================================================
create table market_insights (
  id            uuid primary key default gen_random_uuid(),
  market_id     uuid not null references markets(id) on delete cascade,
  insight_type  text not null,                           -- 'why_choose','complaint_pattern','luxury_expectation'
  title         text not null,
  summary       text not null,
  confidence    numeric(4,3),
  supporting_review_count int not null default 0,
  period_start  date,
  period_end    date,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index idx_insights_market_type on market_insights(market_id, insight_type);

-- =============================================================================
-- OPPORTUNITIES — gaps detected by the Opportunity engine, pre-recommendation.
-- =============================================================================
create table opportunities (
  id                 uuid primary key default gen_random_uuid(),
  market_id          uuid references markets(id) on delete cascade,
  gap_type           text not null,                      -- 'amenity','service','experience','operational','luxury','family','pet'
  title              text not null,
  description        text,
  estimated_cost_usd numeric(10,2),
  difficulty         difficulty_class,
  expected_review_impact numeric(4,3),                   -- modeled effect on rating
  expected_revenue_impact_usd numeric(10,2),
  confidence         numeric(4,3),
  supporting_review_count int not null default 0,
  status             text not null default 'open',       -- 'open','promoted','dismissed'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_opportunities_updated before update on opportunities
  for each row execute function set_updated_at();
create index idx_opportunities_market on opportunities(market_id, status);

-- =============================================================================
-- RECOMMENDATIONS — the monthly deliverable. Every field the spec mandates,
-- and a hard link to evidence via recommendation_evidence.
-- =============================================================================
create table recommendations (
  id                    uuid primary key default gen_random_uuid(),
  market_id             uuid references markets(id) on delete cascade,
  opportunity_id        uuid references opportunities(id) on delete set null,
  report_month          date not null,
  title                 text not null,
  owner_explanation     text,                            -- plain-English for the owner
  operator_explanation  text,                            -- ops-level how-to
  supporting_review_count int not null default 0,
  confidence            numeric(4,3),
  implementation_cost_usd numeric(10,2),
  roi_class             roi_class not null default 'unproven',
  difficulty            difficulty_class,
  expected_guest_impact text,
  expected_revenue_impact_usd numeric(10,2),
  priority_score        numeric(6,3),                     -- ranking key for Top-25
  last_observed_trend   text,                             -- spec: "last observed trend"
  status                text not null default 'active',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_recommendations_updated before update on recommendations
  for each row execute function set_updated_at();
create index idx_recs_market_month on recommendations(market_id, report_month, priority_score desc);

-- Supporting listings for a recommendation (spec: "supporting listings").
create table recommendation_listings (
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  listing_id        uuid not null references listings(id) on delete cascade,
  primary key (recommendation_id, listing_id)
);

-- =============================================================================
-- EVIDENCE — the spine. Any analytic object cites concrete reviews/excerpts.
-- Polymorphic: (subject_type, subject_id) points at a rec/insight/opportunity/
-- trend/market_insight; each row carries the citing review + excerpt + weight.
-- =============================================================================
create table evidence (
  id             uuid primary key default gen_random_uuid(),
  subject_type   text not null,                          -- 'recommendation','opportunity','market_insight','trend','amenity_class'
  subject_id     uuid not null,
  review_id      uuid references reviews(id) on delete set null,
  listing_id     uuid references listings(id) on delete set null,
  excerpt        text,                                    -- the quoted supporting text
  weight         numeric(4,3) default 1.0,
  created_at     timestamptz not null default now()
);
create index idx_evidence_subject on evidence(subject_type, subject_id);
create index idx_evidence_review on evidence(review_id);

-- =============================================================================
-- RECOMMENDATION HISTORY — how a recommendation evolved month over month
-- (new / persisted / strengthened / weakened / retired), for trend continuity.
-- =============================================================================
create table recommendation_history (
  id                uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  report_month      date not null,
  change_type       text not null,                        -- 'new','persisted','strengthened','weakened','retired'
  prev_priority_score numeric(6,3),
  new_priority_score  numeric(6,3),
  note              text,
  created_at        timestamptz not null default now()
);
create index idx_rec_history_rec on recommendation_history(recommendation_id, report_month);

-- =============================================================================
-- MONTHLY REPORTS — the generated intelligence report artifact + its sections.
-- =============================================================================
create table monthly_reports (
  id             uuid primary key default gen_random_uuid(),
  report_month   date not null,
  market_id      uuid references markets(id) on delete cascade,   -- null = all markets
  title          text not null,
  executive_summary text,
  content        jsonb not null default '{}'::jsonb,      -- structured sections
  storage_path   text,                                    -- rendered PDF/HTML pointer
  confidence_summary jsonb not null default '{}'::jsonb,
  generated_at   timestamptz not null default now(),
  unique (report_month, market_id)
);
create index idx_reports_month on monthly_reports(report_month);
