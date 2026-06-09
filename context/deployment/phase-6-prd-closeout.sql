-- Needool Phase 6 — PRD closeout.
-- Run in Supabase SQL editor after phase-4h-push-subscriptions.sql.
-- Adds:
--   • hire_request_otps (6-1) — OTP code store keyed on email
--   • reviews reply columns (6-2) — owner-of-review-target reply
--   • verified_hires.employer_account_session (6-4) — reviewer-only persistent token

-- ---------------------------------------------------------------------------
-- 6-1 — Hire-request OTP store (PRD §8.1)
-- ---------------------------------------------------------------------------
create table if not exists public.hire_request_otps (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  code_hash    text not null,                         -- sha-256 of the 6-digit code
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  attempts     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists hire_request_otps_email_idx
  on public.hire_request_otps (email, created_at desc);

alter table public.hire_request_otps enable row level security;
drop policy if exists "deny all on hire_request_otps" on public.hire_request_otps;
create policy "deny all on hire_request_otps" on public.hire_request_otps
  for all using (false) with check (false);

-- 6-1 — Verified-email proof attached to the hire-request row so we can
-- audit which submissions cleared OTP. Backend re-verifies before insert.
alter table public.hire_requests
  add column if not exists email_verified_at timestamptz,
  add column if not exists otp_verification_id uuid;

-- ---------------------------------------------------------------------------
-- 6-2 — Review reply columns (PRD §9.6)
-- One public reply per review, ≤1000 chars, optional evidence URL, editable 14
-- days then locked (parallel to the review itself).
-- ---------------------------------------------------------------------------
alter table public.reviews
  add column if not exists reply_body          text,
  add column if not exists reply_evidence_url  text,
  add column if not exists reply_created_at    timestamptz,
  add column if not exists reply_updated_at    timestamptz,
  add column if not exists reply_locked_at     timestamptz;

-- ---------------------------------------------------------------------------
-- 6-4 — Employer reviewer-only persistent session (PRD §8.6 + §18.2)
-- The existing verified_hires.employer_review_token is used both for the
-- one-off review-by-token form and for the persistent reviewer-only account
-- surface. Add last_seen_at so we can age sessions out and a marker for the
-- magic-link account-creation event. No new table needed — the reviewer-only
-- account is keyed entirely by the token.
-- ---------------------------------------------------------------------------
alter table public.verified_hires
  add column if not exists employer_account_last_seen_at timestamptz,
  add column if not exists employer_account_created_at   timestamptz;
