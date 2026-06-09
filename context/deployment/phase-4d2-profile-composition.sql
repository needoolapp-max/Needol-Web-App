-- Needool Phase 4D-2 — Profile composition (PRD §3.1, §2.6).
-- Run in Supabase SQL editor after phase-4d1-signup-fields.sql.
-- Adds: bio, location lat/lng, remote/hourly/work-hours/currency, frequency-
-- limit timestamps, and the side tables for links + skills. Storage bucket
-- rows are created last for avatars + CV with public-read so Phase 4D-3 can
-- render <img> tags directly.

-- ---------------------------------------------------------------------------
-- Profile columns on users (PRD §3.1)
-- ---------------------------------------------------------------------------
alter table public.users
  -- Profile picture path inside the avatars bucket. Avatar URL is derived
  -- as `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile_picture_path}`.
  add column if not exists profile_picture_path  text,
  -- PRD §3.1 bio cap is enforced server-side, not by a length constraint
  -- (so existing rows survive a tighter rule). Individual 500, Business 1000.
  add column if not exists bio                   text,
  -- Primary location lat/lng. Display is "distance from viewer" only per §3.1.
  add column if not exists location_lat          numeric(9,6),
  add column if not exists location_lng          numeric(9,6),
  -- PRD §3.1: remote toggle, hourly rate (USD), work hours free-text.
  add column if not exists remote                boolean default false,
  add column if not exists hourly_rate           numeric(10,2),
  add column if not exists currency              text default 'USD',
  add column if not exists work_hours            text,
  -- PRD §3.1: CV path inside the cv bucket; extracted text feeds §4 search.
  add column if not exists cv_path               text,
  add column if not exists cv_extracted_text     text,
  -- PRD §2.6 frequency limits — once per month for phone/WhatsApp, contact
  -- location, primary GPS. Track last-update wall clock per field group.
  add column if not exists phone_updated_at      timestamptz,
  add column if not exists whatsapp_updated_at   timestamptz,
  add column if not exists location_updated_at   timestamptz,
  add column if not exists gps_updated_at        timestamptz,
  add column if not exists profile_picture_updated_at timestamptz,
  add column if not exists cv_updated_at         timestamptz;

-- ---------------------------------------------------------------------------
-- user_links — PRD §3.1 (7 Individual / 15 Business). Cap enforced server-side.
-- ---------------------------------------------------------------------------
create table if not exists public.user_links (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 20),
  url         text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists user_links_user_id_idx on public.user_links (user_id, position);

-- ---------------------------------------------------------------------------
-- Extensions needed for §4 search (pg_trgm enables fuzzy matching on labels).
-- Must be created BEFORE any gin_trgm_ops index.
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- user_skills — PRD §3.1 (30 Individual / 100 Business) + 365-day removal lock.
-- ---------------------------------------------------------------------------
create table if not exists public.user_skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('skill','product','service')),
  label       text not null check (char_length(label) between 1 and 50),
  category    text,
  created_at  timestamptz not null default now()
);

create index if not exists user_skills_user_id_idx on public.user_skills (user_id, kind);
create index if not exists user_skills_label_trgm_idx
  on public.user_skills using gin (label gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- RLS — deny-all browser access, backend writes via service role.
-- ---------------------------------------------------------------------------
alter table public.user_links  enable row level security;
alter table public.user_skills enable row level security;

drop policy if exists "deny all on user_links" on public.user_links;
create policy "deny all on user_links" on public.user_links
  for all using (false) with check (false);

drop policy if exists "deny all on user_skills" on public.user_skills;
create policy "deny all on user_skills" on public.user_skills
  for all using (false) with check (false);

-- ---------------------------------------------------------------------------
-- Storage buckets for avatars + CV.
-- Public read so <img src> works without a signed URL; backend writes via the
-- service role. PRD §3.1 says CV is "view-only, never downloadable" — the
-- frontend enforces that by rendering in a PDF viewer rather than a link.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cv', 'cv', true)
on conflict (id) do nothing;
