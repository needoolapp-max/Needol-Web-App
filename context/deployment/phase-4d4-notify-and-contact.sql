-- Needool Phase 4D-4 — Notify-when-active + contact intent (PRD §3.3, §3.4).
-- Run after phase-4d2-profile-composition.sql.
-- RLS deny-all; backend writes via service role.

-- ---------------------------------------------------------------------------
-- notify_when_active_requests — PRD §3.3
--   Viewer taps "Notify when active" on an Inactive profile. We keep the
--   request for 30 days; if the target activates within that window we
--   notify the requester. After 30 days the request expires silently.
-- ---------------------------------------------------------------------------
create table if not exists public.notify_when_active_requests (
  id              uuid primary key default gen_random_uuid(),
  target_user_id  text not null references public.users(id) on delete cascade,
  requester_id    text not null references public.users(id) on delete cascade,
  status          text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'expired', 'cancelled')),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days'),
  fulfilled_at    timestamptz,
  unique (target_user_id, requester_id, status)
);

create index if not exists notify_active_target_idx
  on public.notify_when_active_requests (target_user_id, status);
create index if not exists notify_active_requester_idx
  on public.notify_when_active_requests (requester_id, status);

-- ---------------------------------------------------------------------------
-- contact_intent_log — PRD §3.4
--   Append-only log of phone/WhatsApp/link reveals so the profile owner gets
--   a leads signal (anonymous if their own profile is currently Inactive).
-- ---------------------------------------------------------------------------
create table if not exists public.contact_intent_log (
  id              uuid primary key default gen_random_uuid(),
  target_user_id  text not null references public.users(id) on delete cascade,
  viewer_id       text references public.users(id) on delete set null,
  intent_type     text not null check (intent_type in ('phone', 'whatsapp', 'link', 'cv')),
  link_url        text,
  created_at      timestamptz not null default now()
);

create index if not exists contact_intent_target_idx
  on public.contact_intent_log (target_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS deny-all
-- ---------------------------------------------------------------------------
alter table public.notify_when_active_requests enable row level security;
alter table public.contact_intent_log enable row level security;

drop policy if exists "deny all on notify_when_active_requests" on public.notify_when_active_requests;
create policy "deny all on notify_when_active_requests" on public.notify_when_active_requests
  for all using (false) with check (false);

drop policy if exists "deny all on contact_intent_log" on public.contact_intent_log;
create policy "deny all on contact_intent_log" on public.contact_intent_log
  for all using (false) with check (false);
