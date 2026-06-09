-- Needool Phase 4D-5 — Search indexes (PRD §4.1, §4.2).
-- pg_trgm extension was created in phase-4d2; this migration adds the trigram
-- and B-tree indexes the search query needs to be fast at scale.

create extension if not exists pg_trgm;

-- Trigram indexes on users — power fuzzy + ILIKE matches across the
-- §4.1 search surface (name, username, bio, CV extracted text).
create index if not exists users_name_trgm_idx
  on public.users using gin (name gin_trgm_ops);
create index if not exists users_username_trgm_idx
  on public.users using gin (username gin_trgm_ops);
create index if not exists users_bio_trgm_idx
  on public.users using gin (bio gin_trgm_ops);
create index if not exists users_cv_trgm_idx
  on public.users using gin (cv_extracted_text gin_trgm_ops);

-- Status + updated_at composite for the §4.2 Active-above-Inactive ordering
-- with recency tiebreak.
create index if not exists users_status_updated_idx
  on public.users (status, updated_at desc);

-- user_skills already has a label trigram index from phase-4d2.
