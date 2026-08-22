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
