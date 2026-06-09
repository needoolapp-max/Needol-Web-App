-- Needool Phase 4B — Admin audit log (PRD §13.2.10).
-- Run in Supabase SQL editor after phase-3b-notifications.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.
--
-- Every admin mutation (PATCH/POST) goes through withAdminAudit(action, fn)
-- which writes a row here on success AND on error. Reads are not audited.
-- `action` is a dotted name (e.g. 'post.approve', 'user.ban',
-- 'hire_request.send_quote', 'withdrawal.mark_paid').

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_user_id text references public.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  request_method text,
  request_path text,
  status text not null default 'ok' check (status in ('ok', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_email, created_at desc);

create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action, created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "deny all on admin_audit_log" on public.admin_audit_log;
create policy "deny all on admin_audit_log" on public.admin_audit_log
  for all using (false) with check (false);
