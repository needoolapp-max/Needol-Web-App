-- Needool Phase 4C — Reviews Trigger B + §9.4 anti-abuse + kill-switch.
-- Run in Supabase SQL editor after phase-4f-engagement.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.

-- ---------------------------------------------------------------------------
-- users.active_since — PRD §9.3 30-day continuously-Active clock.
-- Set when the user first transitions to status='active' from anything else,
-- cleared on any lapse to inactive/restricted/banned.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists active_since timestamptz;

-- Backfill: for currently active users, use the earliest active subscription's
-- current_period_start as a reasonable proxy. Users that have never been
-- active stay null.
update public.users u
set active_since = coalesce(u.active_since, sub_start.first_start)
from (
  select s.user_id, min(s.current_period_start) as first_start
  from public.subscriptions s
  where s.status in ('active', 'trialing')
  group by s.user_id
) sub_start
where u.id = sub_start.user_id
  and u.status = 'active'
  and u.active_since is null;

-- ---------------------------------------------------------------------------
-- feature_flags — Owner kill-switch (PRD §9.4.6) and friends.
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by_email text
);

insert into public.feature_flags (key, enabled, updated_at)
values ('trigger_b_enabled', true, now())
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- review_reports — target requests admin review (PRD §9.4.5).
-- ---------------------------------------------------------------------------
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id text not null references public.users (id) on delete cascade,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'resolved_kept', 'resolved_removed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  admin_id text references public.users (id) on delete set null,
  unique (review_id, reporter_id)
);

create index if not exists review_reports_status_idx
  on public.review_reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Enforce §9.3: a member-trigger reviewer may leave at most one review per
-- target, ever. Partial unique index so Trigger A rows are not affected.
-- ---------------------------------------------------------------------------
create unique index if not exists reviews_member_unique_target_idx
  on public.reviews (reviewer_id, target_user_id)
  where trigger_type = 'member';

-- ---------------------------------------------------------------------------
-- updated_at trigger for feature_flags
-- ---------------------------------------------------------------------------
drop trigger if exists feature_flags_updated_at on public.feature_flags;
create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny-all (service role bypasses RLS)
-- ---------------------------------------------------------------------------
alter table public.feature_flags enable row level security;
alter table public.review_reports enable row level security;

drop policy if exists "deny all on feature_flags" on public.feature_flags;
create policy "deny all on feature_flags" on public.feature_flags
  for all using (false) with check (false);

drop policy if exists "deny all on review_reports" on public.review_reports;
create policy "deny all on review_reports" on public.review_reports
  for all using (false) with check (false);
