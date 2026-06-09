-- Needool Phase 4G — Help & Guide CMS (PRD §14) + notification preferences.
-- Run after phase-4d5-search-indexes.sql.
-- Backend writes via service role; RLS denies browser access on both tables.

-- ---------------------------------------------------------------------------
-- help_articles — PRD §14
--   Admin-authored markdown articles. Public-readable when status='published'.
--   pg_trgm index on (title, body) powers the in-page search.
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

create table if not exists public.help_articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
    check (char_length(slug) between 1 and 100),
  title         text not null check (char_length(title) between 1 and 200),
  body          text not null,
  excerpt       text,
  category      text,
  tags          jsonb not null default '[]'::jsonb,
  status        text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  author_id     text references public.users (id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists help_articles_status_published_idx
  on public.help_articles (status, published_at desc);
create index if not exists help_articles_category_idx
  on public.help_articles (category);
create index if not exists help_articles_title_trgm_idx
  on public.help_articles using gin (title gin_trgm_ops);
create index if not exists help_articles_body_trgm_idx
  on public.help_articles using gin (body gin_trgm_ops);

drop trigger if exists help_articles_updated_at on public.help_articles;
create trigger help_articles_updated_at
  before update on public.help_articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_preferences — opt-outs per (user, event_type).
--   Default behavior is "subscribed" — we only persist explicit opt-outs.
--   `enabled=false` skips both in_app and email delivery. Some critical events
--   (subscription_expired, withdrawal_completed/failed, hired) ignore the
--   opt-out at emit time per PRD §12 wording.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id     text not null references public.users (id) on delete cascade,
  event_type  text not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, event_type)
);

create index if not exists notification_prefs_user_idx
  on public.notification_preferences (user_id);

drop trigger if exists notification_prefs_updated_at on public.notification_preferences;
create trigger notification_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny-all browser access. Service role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.help_articles            enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "deny all on help_articles" on public.help_articles;
create policy "deny all on help_articles" on public.help_articles
  for all using (false) with check (false);

drop policy if exists "deny all on notification_preferences" on public.notification_preferences;
create policy "deny all on notification_preferences" on public.notification_preferences
  for all using (false) with check (false);
