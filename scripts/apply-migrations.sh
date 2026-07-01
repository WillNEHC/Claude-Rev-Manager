#!/usr/bin/env bash
# Apply GDIP migrations to a Postgres database and run smoke checks.
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:port/db ./scripts/apply-migrations.sh
#
# Works against any Postgres with the pgvector, pg_trgm, pgcrypto, and uuid-ossp
# extensions available (Supabase has them; for a local box install
# postgresql-<v>-pgvector). Migration 0004 self-provisions the anon/authenticated
# roles if absent, so this runs on a vanilla Postgres too. Idempotent per file
# only on a fresh DB (policies/seeds use fixed names); point it at an empty DB.
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the target database}"
cd "$(dirname "$0")/.."

echo "=== applying migrations ==="
for f in supabase/migrations/000*.sql; do
  echo ">> $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "=== smoke checks ==="
psql "$DATABASE_URL" -tAc "select 'markets=' || count(*) from markets"
psql "$DATABASE_URL" -tAc "select 'categories=' || count(*) from categories"
psql "$DATABASE_URL" -tAc "select 'personas=' || count(*) from traveler_personas"
psql "$DATABASE_URL" -tAc "select 'match_reviews fn=' || count(*) from pg_proc where proname='match_reviews'"
echo "OK"
