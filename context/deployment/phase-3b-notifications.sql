-- Needool Phase 3B — Notifications.
-- Run in Supabase SQL editor after phase-3-referrals-wallet-withdrawals.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.
--
-- PRD §12 — channels are in-app (always), email (important events), web push
-- (opt-in PWA; not built in this chunk). The `channels` jsonb column stores the
-- intended channel set; `email_sent_at` records when an email was actually sent
-- (null if email channel was off, or RESEND_API_KEY is missing, or it's pending).
--
-- We keep the existing `users.notifications` jsonb-array column intact for
-- backward compatibility with /api/auth/me, but new structured notifications
-- now live here.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  event_type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  channels jsonb not null default '["in_app"]'::jsonb,
  email_sent_at timestamptz,
  email_provider_id text,
  email_error text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at nulls first, created_at desc);

create index if not exists notifications_event_type_idx
  on public.notifications (event_type, created_at desc);

-- updated_at trigger (reuses set_updated_at() from supabase-demo-state.sql)
drop trigger if exists notifications_updated_at on public.notifications;
create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- RLS: deny all browser access (backend uses service role)
alter table public.notifications enable row level security;

drop policy if exists "deny all on notifications" on public.notifications;
create policy "deny all on notifications" on public.notifications
  for all using (false) with check (false);
