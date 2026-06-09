-- Needool Phase 4H — Web push subscriptions (PRD §12 push channel, §15.5 PWA).
-- Run after phase-4g-help-and-prefs.sql.
-- Stores opaque W3C PushSubscription objects so the launch-time push sender
-- can target them. Sending itself is deferred to launch (founder owns the
-- VAPID key + production sender wiring).

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id, last_seen_at desc);

alter table public.push_subscriptions enable row level security;

drop policy if exists "deny all on push_subscriptions" on public.push_subscriptions;
create policy "deny all on push_subscriptions" on public.push_subscriptions
  for all using (false) with check (false);
