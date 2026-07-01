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
