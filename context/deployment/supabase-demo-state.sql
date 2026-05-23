-- Needool dummy deployment Supabase setup.
-- Run this in the Supabase SQL editor before setting DATA_PROVIDER=supabase.
-- This is intentionally a simple JSON state table for the founder-review demo.
-- The full production schema should replace this later.

create table if not exists public.needool_app_state (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists needool_app_state_updated_at on public.needool_app_state;

create trigger needool_app_state_updated_at
before update on public.needool_app_state
for each row
execute function public.set_updated_at();

alter table public.needool_app_state enable row level security;

-- No public browser access. The backend uses SUPABASE_SERVICE_ROLE_KEY server-side.
drop policy if exists "No public access to dummy app state" on public.needool_app_state;

create policy "No public access to dummy app state"
on public.needool_app_state
for all
using (false)
with check (false);

-- Optional storage buckets for later profile images, thumbnails, and CV PDFs.
-- Keep buckets private until real auth/RLS policies are implemented.
insert into storage.buckets (id, name, public)
values
  ('needool-profile-images', 'needool-profile-images', false),
  ('needool-post-thumbnails', 'needool-post-thumbnails', false),
  ('needool-cv-pdfs', 'needool-cv-pdfs', false)
on conflict (id) do nothing;
