-- Needool Phase 1 — Users moderation + Posts (Needs, Opportunities, Events).
-- Run in Supabase SQL editor after clerk-nowpayments-init.sql.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.

-- ---------------------------------------------------------------------------
-- users: extend status enum + add moderation fields (PRD §2.2, §13.3)
-- ---------------------------------------------------------------------------
alter table public.users
  drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check
  check (status in ('inactive', 'active', 'restricted', 'banned'));

alter table public.users
  add column if not exists module_restrictions jsonb not null default '[]'::jsonb,
  add column if not exists banned_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists restricted_at timestamptz,
  add column if not exists restricted_reason text;

create index if not exists users_status_idx on public.users (status);

-- ---------------------------------------------------------------------------
-- posts: Need Requests / Opportunities / Events share one table (PRD §15.2)
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id text references public.users (id) on delete set null,
  kind text not null check (kind in ('need', 'opportunity', 'event')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'closed')),
  title text not null,
  description text not null default '',
  thumbnail_url text,
  scope text not null default 'worldwide'
    check (scope in ('worldwide', 'country', 'state', 'city', 'near')),
  scope_country text,
  scope_state text,
  scope_city text,
  scope_lat numeric(9, 6),
  scope_lng numeric(9, 6),
  scope_radius_km integer,
  links jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  pinned boolean not null default false,
  moderated_by text references public.users (id) on delete set null,
  moderated_at timestamptz,
  rejected_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_kind_idx on public.posts (status, kind, created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_scope_idx on public.posts (scope_country, scope_state, scope_city);
create index if not exists posts_pinned_idx on public.posts (pinned, status, kind);

-- Constraint: only kind='event' posts may have a null author_id (admin authored).
-- All other posts must have an author.
alter table public.posts
  drop constraint if exists posts_author_required;
alter table public.posts
  add constraint posts_author_required
  check (kind = 'event' or author_id is not null);

-- ---------------------------------------------------------------------------
-- comments: only attached to kind='need' posts (PRD §6.1 Opportunities have no comments)
-- Enforced at insert time by the backend; not as a CHECK across tables.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id text not null references public.users (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_author_idx on public.comments (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses set_updated_at() from supabase-demo-state.sql)
-- ---------------------------------------------------------------------------
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny all browser access (backend uses service role)
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.comments enable row level security;

drop policy if exists "deny all on posts" on public.posts;
create policy "deny all on posts" on public.posts
  for all using (false) with check (false);

drop policy if exists "deny all on comments" on public.comments;
create policy "deny all on comments" on public.comments
  for all using (false) with check (false);
