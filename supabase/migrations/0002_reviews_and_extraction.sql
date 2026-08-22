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
