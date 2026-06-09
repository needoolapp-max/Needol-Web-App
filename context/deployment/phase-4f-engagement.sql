-- Needool Phase 4F — Need/Opportunity post interactions (PRD §5.4, §6.1, §3.2).
-- Run in Supabase SQL editor after phase-4b-audit-log.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.
--
-- The `comments` table already exists from phase-1-posts.sql; this migration
-- only adds the four engagement tables (post_likes, post_saves, comment_likes,
-- follows) and the indexes needed for fast aggregate counts on the
-- post-detail and profile pages.
--
-- Comments are written through the existing comments table. Per PRD §6.1,
-- comments are only valid on posts of kind='need'; that rule is enforced
-- backend-side, not by a check constraint (the table can in theory hold
-- comments for any kind to keep the schema simple).

-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_likes_post_idx on public.post_likes (post_id);
create index if not exists post_likes_user_idx on public.post_likes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- post_saves
-- ---------------------------------------------------------------------------
create table if not exists public.post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_saves_post_idx on public.post_saves (post_id);
create index if not exists post_saves_user_idx on public.post_saves (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- comment_likes
-- ---------------------------------------------------------------------------
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);
create index if not exists comment_likes_user_idx on public.comment_likes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- follows — followee gets a notification + count surfaces on profile
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id text not null references public.users (id) on delete cascade,
  followee_id text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: deny all browser access (backend uses service role)
-- ---------------------------------------------------------------------------
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;

drop policy if exists "deny all on post_likes" on public.post_likes;
create policy "deny all on post_likes" on public.post_likes
  for all using (false) with check (false);

drop policy if exists "deny all on post_saves" on public.post_saves;
create policy "deny all on post_saves" on public.post_saves
  for all using (false) with check (false);

drop policy if exists "deny all on comment_likes" on public.comment_likes;
create policy "deny all on comment_likes" on public.comment_likes
  for all using (false) with check (false);

drop policy if exists "deny all on follows" on public.follows;
create policy "deny all on follows" on public.follows
  for all using (false) with check (false);
