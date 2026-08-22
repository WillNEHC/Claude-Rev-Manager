-- =============================================================================
-- GDIP — consolidated migrations 0002–0008 (run AFTER 0001).
-- Convenience file for the Supabase SQL Editor when apply-by-tool is unavailable.
-- Paste this whole file into Dashboard → SQL Editor → Run. Safe on a fresh schema;
-- 0001 (core tables) must already be applied. Identical to the numbered files.
-- =============================================================================

-- =============================================================================
-- GDIP Migration 0002 — Reviews, Ingestion, AI Extraction
--
-- Reviews are the atomic unit of intelligence. Every review:
--   * is deduplicated by content_hash (spec: "never duplicate reviews")
--   * carries an immutable source snapshot
--   * is processed once into a structured `review_extractions` row
--   * fans out into mention tables (amenities, personas, categories, delights...)
-- =============================================================================

-- =============================================================================
-- INGESTION BOOKKEEPING — crawl runs + raw pages (incremental, change-detect).
-- =============================================================================
create table crawl_runs (
  id             uuid primary key default gen_random_uuid(),
  market_id      uuid references markets(id) on delete set null,
  source         platform_source not null,
  status         crawl_status not null default 'pending',
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  pages_fetched  int not null default 0,
  reviews_found  int not null default 0,
  reviews_new    int not null default 0,
  error          text,
  config         jsonb not null default '{}'::jsonb,   -- firecrawl params used
  created_at     timestamptz not null default now()
);
create index idx_crawl_runs_market on crawl_runs(market_id, source, started_at desc);

-- Raw fetched payloads. Retained for reproducibility + change detection.
-- content_hash lets us skip re-processing unchanged pages (incremental crawl).
create table raw_pages (
  id            uuid primary key default gen_random_uuid(),
  crawl_run_id  uuid references crawl_runs(id) on delete set null,
  source        platform_source not null,
  url           text not null,
  content_hash  text not null,                          -- sha256 of normalized body
  fetched_at    timestamptz not null default now(),
  storage_path  text,                                   -- pointer to object storage if large
  http_status   int,
  metadata      jsonb not null default '{}'::jsonb,
  unique (url, content_hash)                             -- same content once
);
create index idx_raw_pages_crawl on raw_pages(crawl_run_id);

-- =============================================================================
-- REVIEWS — the corpus. Deduplicated, source-attributed, historically preserved.
-- =============================================================================
create table reviews (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid references listings(id) on delete set null,
  market_id         uuid not null references markets(id) on delete restrict,
  host_id           uuid references hosts(id) on delete set null,
  source            platform_source not null,
  source_review_id  text,                               -- platform's own review id if any
  -- Dedup key: hash of (source, normalized author+date+body). Enforced unique.
  content_hash      text not null,
  author_name       text,
  review_date       date,
  rating            numeric(3,2),                        -- normalized 0-5
  language          text default 'en',
  body              text not null,
  raw_page_id       uuid references raw_pages(id) on delete set null,
  ingested_at       timestamptz not null default now(),
  -- Processing state machine for the extraction pipeline.
  is_processed      boolean not null default false,
  processed_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (source, content_hash)
);
create index idx_reviews_listing on reviews(listing_id);
create index idx_reviews_market_date on reviews(market_id, review_date);
create index idx_reviews_unprocessed on reviews(is_processed) where is_processed = false;
create index idx_reviews_body_trgm on reviews using gin (body gin_trgm_ops);

-- =============================================================================
-- REVIEW METADATA — extra source-specific fields kept out of the hot table.
-- =============================================================================
create table review_metadata (
  review_id     uuid primary key references reviews(id) on delete cascade,
  helpful_count int,
  response_body text,                                    -- host response, if present
  response_date date,
  trip_length_nights int,
  stayed_month  int,
  extra         jsonb not null default '{}'::jsonb
);

-- =============================================================================
-- REVIEW EXTRACTIONS — one structured record per processed review.
-- The AI pipeline (docs/05) emits this shape; downstream engines read from here.
-- Scalar/boolean signals live in columns; open-ended lists fan out to mentions.
-- =============================================================================
create table review_extractions (
  review_id            uuid primary key references reviews(id) on delete cascade,
  model                text not null,                   -- model + version used
  schema_version       int not null default 1,
  -- Trip context
  trip_purpose         text,                            -- free text, normalized later
  reasons_for_booking  text[],
  reasons_to_return    text[],
  reasons_not_to_return text[],
  -- Experience dimensions (nullable = not mentioned)
  sentiment            sentiment_polarity,
  sentiment_score      numeric(4,3),                    -- -1..1
  cleanliness_score    numeric(4,3),
  communication_score  numeric(4,3),
  checkin_score        numeric(4,3),
  value_score          numeric(4,3),
  -- Signal flags surfaced by extraction
  has_operational_issue boolean not null default false,
  has_maintenance_issue boolean not null default false,
  has_unexpected_delight boolean not null default false,
  is_exceptional        boolean not null default false, -- "five-star experience" markers
  is_disappointment     boolean not null default false,
  -- Verbatim highlights the engines cite as evidence
  memorable_moments    text[],
  exceptional_phrases  text[],
  disappointment_phrases text[],
  hidden_gems          text[],
  -- Confidence the extractor assigns to this record
  extraction_confidence numeric(4,3),
  raw                  jsonb not null default '{}'::jsonb, -- full model output for audit
  created_at           timestamptz not null default now()
);

-- =============================================================================
-- MENTION TABLES — fan-out of extraction results. Each is a citation-grade edge
-- between a review and a taxonomy entity, tagged with sentiment + confidence.
-- These are what the Trend / Opportunity / Expectation engines aggregate over.
-- =============================================================================

-- Amenity mentions (spec: AmenityMentions) — positive/negative amenity signal.
create table amenity_mentions (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references reviews(id) on delete cascade,
  amenity_id   uuid not null references amenities(id) on delete cascade,
  sentiment    sentiment_polarity,
  is_positive  boolean,
  is_negative  boolean,
  excerpt      text,                                    -- supporting quote
  confidence   numeric(4,3),
  created_at   timestamptz not null default now(),
  unique (review_id, amenity_id)
);
create index idx_amenity_mentions_amenity on amenity_mentions(amenity_id);

-- Category classifications (spec: Categories / Sentiment per category).
create table review_categories (
  review_id   uuid not null references reviews(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  sentiment   sentiment_polarity,
  confidence  numeric(4,3),
  excerpt     text,
  primary key (review_id, category_id)
);
create index idx_review_categories_cat on review_categories(category_id);

-- Persona classifications (spec: TravelerPersonas).
create table review_personas (
  review_id   uuid not null references reviews(id) on delete cascade,
  persona_id  uuid not null references traveler_personas(id) on delete cascade,
  confidence  numeric(4,3),
  excerpt     text,
  primary key (review_id, persona_id)
);
create index idx_review_personas_persona on review_personas(persona_id);

-- Operational issues (spec: OperationalIssues) — maintenance/ops pain points.
create table operational_issues (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references reviews(id) on delete cascade,
  category_id  uuid references categories(id) on delete set null,
  issue_type   text,                                    -- 'wifi_down','dirty_bathroom'
  severity     int check (severity between 1 and 5),
  excerpt      text,
  confidence   numeric(4,3),
  created_at   timestamptz not null default now()
);
create index idx_ops_issues_review on operational_issues(review_id);
create index idx_ops_issues_type on operational_issues(issue_type);

-- Guest delighters (spec: GuestDelighters) — the memorable-experience atoms.
create table guest_delighters (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references reviews(id) on delete cascade,
  delighter_type text,                                  -- 'welcome_basket','birthday_surprise'
  amenity_id    uuid references amenities(id) on delete set null,
  excerpt       text,
  confidence    numeric(4,3),
  created_at    timestamptz not null default now()
);
create index idx_delighters_type on guest_delighters(delighter_type);

-- Local-business / place mentions (restaurants, breweries, attractions, events).
-- Backed by the `local_businesses` dimension in migration 0003.
create table place_mentions (
  id             uuid primary key default gen_random_uuid(),
  review_id      uuid not null references reviews(id) on delete cascade,
  local_business_id uuid,                               -- FK added in 0003 after table exists
  raw_name       text,                                  -- as written before resolution
  place_type     text,                                  -- 'restaurant','brewery','attraction'
  sentiment      sentiment_polarity,
  excerpt        text,
  confidence     numeric(4,3),
  created_at     timestamptz not null default now()
);
create index idx_place_mentions_review on place_mentions(review_id);
create index idx_place_mentions_name_trgm on place_mentions using gin (raw_name gin_trgm_ops);
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
-- =============================================================================
-- GDIP Migration 0004 — Vector Embeddings + Semantic Search (RAG)
--
-- Powers natural-language questions ("What do families complain about on Squam
-- Lake?") via retrieval over the review corpus. We embed reviews and selected
-- synthesized objects, then expose a match function the RAG layer calls.
--
-- NOTE: vector dimension must match EMBEDDINGS_MODEL. Default below is 1536
-- (OpenAI text-embedding-3-small). Change the literal if you swap models.
-- =============================================================================

-- Review-level embeddings. One row per embedded chunk (a review may chunk if long).
create table review_embeddings (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references reviews(id) on delete cascade,
  market_id    uuid not null references markets(id) on delete cascade,
  chunk_index  int not null default 0,
  content      text not null,                             -- the embedded text
  embedding    vector(1536) not null,
  model        text not null,
  created_at   timestamptz not null default now(),
  unique (review_id, chunk_index)
);

-- IVFFlat index for approximate nearest-neighbor search (cosine distance).
-- Build after you have a meaningful number of rows; lists≈sqrt(rowcount).
create index idx_review_embeddings_ann
  on review_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_review_embeddings_market on review_embeddings(market_id);

-- Embeddings for synthesized objects (insights, delighters) so RAG can retrieve
-- higher-order findings, not just raw reviews.
create table insight_embeddings (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null,                             -- 'market_insight','guest_delighter'
  subject_id   uuid not null,
  market_id    uuid references markets(id) on delete cascade,
  content      text not null,
  embedding    vector(1536) not null,
  model        text not null,
  created_at   timestamptz not null default now()
);
create index idx_insight_embeddings_ann
  on insight_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- -----------------------------------------------------------------------------
-- match_reviews — retrieval function for the RAG layer.
-- Returns the most semantically similar reviews, optionally scoped to a market
-- and filtered by minimum similarity. The API layer post-filters by persona/
-- category/date using the mention tables before sending context to the model.
-- -----------------------------------------------------------------------------
create or replace function match_reviews(
  query_embedding vector(1536),
  match_count     int default 20,
  filter_market   uuid default null,
  min_similarity  float default 0.0
)
returns table (
  review_id   uuid,
  market_id   uuid,
  content     text,
  similarity  float
)
language sql stable as $$
  select
    re.review_id,
    re.market_id,
    re.content,
    1 - (re.embedding <=> query_embedding) as similarity
  from review_embeddings re
  where (filter_market is null or re.market_id = filter_market)
    and 1 - (re.embedding <=> query_embedding) >= min_similarity
  order by re.embedding <=> query_embedding
  limit match_count;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security posture.
-- GDIP is a single power-user internal tool. Server-side jobs use the
-- service-role key (bypasses RLS). The dashboard reads via the anon key, so we
-- enable RLS and grant read-only to authenticated users; writes stay server-side.
-- Tighten to per-user policies if the tool is ever multi-tenant.
--
-- Supabase provisions the `anon` and `authenticated` roles; a vanilla Postgres
-- (local/CI) does not. Guard-create them so this migration is self-contained and
-- portable — on Supabase the roles already exist and creation is skipped.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'markets','hosts','listings','amenities','listing_amenities','categories',
    'traveler_personas','reviews','review_metadata','review_extractions',
    'amenity_mentions','review_categories','review_personas','operational_issues',
    'guest_delighters','place_mentions','local_businesses','monthly_snapshots',
    'trend_history','market_insights','opportunities','recommendations',
    'recommendation_listings','evidence','recommendation_history','monthly_reports',
    'review_embeddings','insight_embeddings','crawl_runs','raw_pages'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy "auth_read_%1$s" on %1$I for select to authenticated using (true);$f$, t);
  end loop;
end $$;
-- =============================================================================
-- GDIP Migration 0005 — Seed Reference Data
-- Seeds the four V1 markets, the standardized category taxonomy, and the seed
-- traveler personas. Amenity dictionary is seeded lightly; the pipeline grows it.
-- Idempotent via ON CONFLICT so it is safe to re-run.
-- =============================================================================

-- --- Markets -----------------------------------------------------------------
insert into markets (slug, name, region, center_lat, center_lng, search_terms) values
  ('lake-winnipesaukee','Lake Winnipesaukee','New Hampshire',43.6406,-71.3106,
     array['Lake Winnipesaukee vacation rental','Winnipesaukee lakefront home','Wolfeboro Meredith Gilford rental']),
  ('squam-lake','Squam Lake','New Hampshire',43.7690,-71.5440,
     array['Squam Lake vacation rental','Holderness NH lakefront','Squam Lake cottage']),
  ('newfound-lake','Newfound Lake','New Hampshire',43.6640,-71.7690,
     array['Newfound Lake vacation rental','Bristol NH lakefront home','Newfound Lake cottage']),
  ('lake-sunapee','Lake Sunapee','New Hampshire',43.3920,-72.0510,
     array['Lake Sunapee vacation rental','Sunapee lakefront home','New London NH rental'])
on conflict (slug) do nothing;

-- --- Categories (standardized review taxonomy) -------------------------------
-- Top-level categories from the spec. Sub-categories (Dock, Beach, etc.) can be
-- added with parent_id references; a few key children are seeded as examples.
insert into categories (slug, name) values
  ('amenities','Amenities'),
  ('guest_experience','Guest Experience'),
  ('host','Host'),
  ('communication','Communication'),
  ('cleanliness','Cleanliness'),
  ('design','Design'),
  ('outdoor_experience','Outdoor Experience'),
  ('location','Location'),
  ('restaurants','Restaurants'),
  ('activities','Activities'),
  ('events','Events'),
  ('maintenance','Maintenance'),
  ('parking','Parking'),
  ('technology','Technology'),
  ('value','Value'),
  ('family_experience','Family Experience'),
  ('luxury','Luxury'),
  ('accessibility','Accessibility'),
  ('pets','Pets')
on conflict (slug) do nothing;

-- Example sub-categories under Outdoor Experience.
insert into categories (slug, name, parent_id)
select v.slug, v.name, c.id
from (values
  ('dock','Dock'),
  ('lake_access','Lake Access'),
  ('beach','Beach'),
  ('fire_pit_area','Fire Pit Area')
) as v(slug, name)
cross join (select id from categories where slug = 'outdoor_experience') c
on conflict (slug) do nothing;

-- --- Traveler personas (seed set; emergent personas added by pipeline) -------
insert into traveler_personas (slug, name, is_seed, description) values
  ('families','Families',true,'Households traveling with children'),
  ('couples','Couples',true,'Two-adult leisure trips, romantic getaways'),
  ('wedding_guests','Wedding Guests',true,'Guests attending or hosting weddings'),
  ('luxury_travelers','Luxury Travelers',true,'High-end expectations, premium amenities'),
  ('pet_owners','Pet Owners',true,'Traveling with dogs/pets'),
  ('remote_workers','Remote Workers',true,'Working remotely during the stay'),
  ('business_travelers','Business Travelers',true,'Work-purpose trips'),
  ('fishing_groups','Fishing Groups',true,'Trips centered on fishing'),
  ('boating_groups','Boating Groups',true,'Trips centered on boating/watersports'),
  ('friends_trips','Friends Trips',true,'Groups of friends'),
  ('multigen_families','Multi-Generational Families',true,'Three+ generations traveling together'),
  ('seasonal_visitors','Seasonal Visitors',true,'Leaf-peeping, ski, summer-season visitors')
on conflict (slug) do nothing;

-- --- Amenities (light seed; expectation classification is data-driven) -------
insert into amenities (slug, name, category, classification) values
  ('fast_wifi','Fast Wi-Fi','technology','table_stakes'),
  ('smart_lock','Smart Lock','technology','table_stakes'),
  ('stocked_kitchen','Fully Stocked Kitchen','kitchen','table_stakes'),
  ('fire_pit','Fire Pit','outdoor','delight'),
  ('smores_kit','S''mores Kit','outdoor','delight'),
  ('paddleboards','Paddleboards','outdoor','delight'),
  ('local_gift','Local Welcome Gift','experience','delight'),
  ('dog_welcome_kit','Dog Welcome Kit','pets','delight'),
  ('curated_local_guide','Curated Local Guide','experience','delight'),
  ('private_dock','Private Dock','outdoor','unknown'),
  ('hot_tub','Hot Tub','outdoor','unknown')
on conflict (slug) do nothing;
-- =============================================================================
-- GDIP Migration 0006 — Extraction Bookkeeping
--
-- Quarantine table for reviews whose AI extraction produced invalid output or
-- errored. The review stays is_processed=false (eligible for retry); this table
-- records why, how many times, and the raw model output for debugging. Keeping
-- quarantine durable (not just logged) means bad extractions are auditable and
-- retryable without ever polluting review_extractions.
-- =============================================================================

create table extraction_failures (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references reviews(id) on delete cascade,
  error         text not null,
  raw           jsonb,                         -- raw model output, for debugging
  attempts      int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  resolved      boolean not null default false, -- set true once a later run succeeds
  unique (review_id)
);
create index idx_extraction_failures_unresolved
  on extraction_failures(resolved) where resolved = false;

alter table extraction_failures enable row level security;
create policy "auth_read_extraction_failures" on extraction_failures
  for select to authenticated using (true);

-- Queue view for the embedding job: reviews that have no embeddings yet.
create view reviews_needing_embedding as
  select r.id, r.market_id, r.body
  from reviews r
  left join review_embeddings re on re.review_id = r.id
  where re.review_id is null;
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
