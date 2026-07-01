-- =============================================================================
-- GDIP Migration 0001 — Extensions + Core Entities
-- Guest Demand Intelligence Platform
--
-- Design principles:
--   * Normalized, config-driven, multi-market. Adding a market = a row, not code.
--   * Every analytic claim traces to Evidence rows (see 0003).
--   * Historical snapshots are append-only; reviews are deduplicated by content hash.
--   * Vector embeddings (pgvector) enable semantic search / RAG (see 0004).
-- =============================================================================

-- --- Extensions --------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";     -- gen_random_uuid, digest()
create extension if not exists "vector";        -- pgvector, semantic search
create extension if not exists "pg_trgm";       -- fuzzy text search on names

-- --- Enumerated types --------------------------------------------------------
-- Kept as enums where the domain is stable; free-form taxonomies live in tables.
do $$ begin
  create type platform_source as enum ('airbnb','vrbo','booking','google','reddit','forum','blog','destination_site','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_property_type as enum ('entire_home','private_room','cabin','cottage','estate','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sentiment_polarity as enum ('very_negative','negative','neutral','positive','very_positive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type amenity_class as enum ('table_stakes','delight','unknown');  -- Guest Expectation Index
exception when duplicate_object then null; end $$;

do $$ begin
  create type roi_class as enum ('low','moderate','high','exceptional','unproven');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_class as enum ('trivial','easy','moderate','hard','major_capex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crawl_status as enum ('pending','running','succeeded','partial','failed');
exception when duplicate_object then null; end $$;

-- --- Reusable timestamp trigger ---------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================================
-- MARKETS — the top-level geography. Expansion = insert a row.
-- =============================================================================
create table markets (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                -- 'lake-winnipesaukee'
  name            text not null,                       -- 'Lake Winnipesaukee'
  region          text not null default 'New Hampshire',
  -- Bounding geometry / search config is driven by config/markets.yaml, mirrored here.
  center_lat      double precision,
  center_lng      double precision,
  search_terms    text[] not null default '{}',        -- seed queries for discovery
  is_active       boolean not null default true,
  config          jsonb not null default '{}'::jsonb,  -- per-market overrides (filters, sources)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_markets_updated before update on markets
  for each row execute function set_updated_at();

-- =============================================================================
-- HOSTS — property operators. A host may own listings across markets/platforms.
-- =============================================================================
create table hosts (
  id                uuid primary key default gen_random_uuid(),
  platform          platform_source not null,
  platform_host_id  text,                              -- id on the source platform
  display_name      text,
  is_superhost      boolean,
  superhost_since   date,
  profile_url       text,
  response_rate     numeric(5,2),
  metadata          jsonb not null default '{}'::jsonb,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (platform, platform_host_id)
);
create trigger trg_hosts_updated before update on hosts
  for each row execute function set_updated_at();

-- =============================================================================
-- LISTINGS — the properties we track. Discovery filters applied at ingest.
-- =============================================================================
create table listings (
  id                  uuid primary key default gen_random_uuid(),
  market_id           uuid not null references markets(id) on delete restrict,
  host_id             uuid references hosts(id) on delete set null,
  platform            platform_source not null,
  platform_listing_id text,                            -- id on the source platform
  url                 text,
  title               text,
  property_type       listing_property_type not null default 'entire_home',
  -- Discovery-criteria flags (spec: entire home, luxury, family, pet friendly, superhost).
  is_entire_home      boolean,
  is_luxury           boolean,
  is_family_oriented  boolean,
  is_pet_friendly     boolean,
  -- Snapshot of headline attributes; full history lives in monthly_snapshots.
  bedrooms            int,
  bathrooms           numeric(4,1),
  max_guests          int,
  nightly_rate_usd    numeric(10,2),
  rating_overall      numeric(3,2),
  review_count        int,
  lat                 double precision,
  lng                 double precision,
  amenities_raw       jsonb not null default '{}'::jsonb,  -- as-scraped amenity blob
  metadata            jsonb not null default '{}'::jsonb,
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (platform, platform_listing_id)
);
create trigger trg_listings_updated before update on listings
  for each row execute function set_updated_at();

create index idx_listings_market on listings(market_id);
create index idx_listings_host on listings(host_id);
create index idx_listings_flags on listings(is_luxury, is_family_oriented, is_pet_friendly);
create index idx_listings_title_trgm on listings using gin (title gin_trgm_ops);

-- =============================================================================
-- AMENITIES — canonical amenity dictionary. Mentions link reviews->amenities.
-- classification (table_stakes vs delight) is data-driven & recomputed by the
-- Guest Expectation Index engine; stored here as the current best estimate.
-- =============================================================================
create table amenities (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,              -- 'fast_wifi', 'fire_pit'
  name              text not null,
  category          text,                              -- 'outdoor','kitchen','tech'...
  classification    amenity_class not null default 'unknown',
  classification_confidence numeric(4,3),
  aliases           text[] not null default '{}',      -- surface forms seen in reviews
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_amenities_updated before update on amenities
  for each row execute function set_updated_at();

-- Listing<->Amenity (what a property advertises / is observed to have).
create table listing_amenities (
  listing_id  uuid not null references listings(id) on delete cascade,
  amenity_id  uuid not null references amenities(id) on delete cascade,
  source      platform_source,
  primary key (listing_id, amenity_id)
);

-- =============================================================================
-- CATEGORIES — standardized review classification taxonomy (config/taxonomy).
-- Hierarchical via parent_id so 'Outdoor Experience > Dock' is expressible.
-- =============================================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                    -- 'cleanliness','dock'
  name        text not null,
  parent_id   uuid references categories(id) on delete set null,
  description text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TRAVELER PERSONAS — seeded set, plus emergent personas flagged for review.
-- =============================================================================
create table traveler_personas (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,                  -- 'families','remote_workers'
  name          text not null,
  description   text,
  is_seed       boolean not null default false,        -- seeded vs emerged from data
  is_confirmed  boolean not null default true,         -- emergent personas start false
  evidence_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_personas_updated before update on traveler_personas
  for each row execute function set_updated_at();
