-- Needool Phase 2 — Hire Requests, Job Openings, Applications, Verified Hires, Reviews (Trigger A).
-- Run in Supabase SQL editor after phase-1-posts.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.

-- ---------------------------------------------------------------------------
-- hire_requests: public employer requests (PRD §8.1)
-- ---------------------------------------------------------------------------
create table if not exists public.hire_requests (
  id uuid primary key default gen_random_uuid(),
  employer_name text not null,
  employer_website text,
  contact_name text,
  contact_email text not null,
  contact_phone text,
  contact_whatsapp text,
  role_title text not null,
  num_hires integer not null default 1,
  account_type_pref text not null default 'Both'
    check (account_type_pref in ('Individual', 'Business', 'Both')),
  employment_type text not null default 'remote'
    check (employment_type in ('remote', 'onsite', 'hybrid')),
  location text,
  job_description text,
  qualifications text,
  salary_usd numeric(12, 2),
  other_benefits text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'quoted', 'paid', 'promoted', 'cancelled')),
  quote_amount_usd numeric(12, 2),
  quote_payment_id text,
  quote_order_id text,
  quote_sent_at timestamptz,
  quote_expires_at timestamptz,
  paid_at timestamptz,
  promoted_job_opening_id uuid,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hire_requests_status_idx on public.hire_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- job_openings: drafts + published openings (PRD §8.3)
-- ---------------------------------------------------------------------------
create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  hire_request_id uuid references public.hire_requests (id) on delete set null,
  external_job_opening_id text,
  title text not null,
  eligible_account_type text not null default 'Both'
    check (eligible_account_type in ('Individual', 'Business', 'Both')),
  eligible_locations jsonb not null default '[]'::jsonb,
  eligible_nationalities jsonb not null default '[]'::jsonb,
  employment_type text not null default 'Remote'
    check (employment_type in ('Remote', 'OnSite', 'Hybrid')),
  description text,
  application_instructions text,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed')),
  pinned boolean not null default false,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_openings_status_idx on public.job_openings (status, created_at desc);
create index if not exists job_openings_hire_request_idx on public.job_openings (hire_request_id);

-- ---------------------------------------------------------------------------
-- job_opening_questions: up to 10 per opening (PRD §8.3)
-- ---------------------------------------------------------------------------
create table if not exists public.job_opening_questions (
  id uuid primary key default gen_random_uuid(),
  job_opening_id uuid not null references public.job_openings (id) on delete cascade,
  position integer not null,
  prompt text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (job_opening_id, position)
);

create index if not exists job_opening_questions_opening_idx on public.job_opening_questions (job_opening_id, position);

-- ---------------------------------------------------------------------------
-- job_applications: applicant submits, admin scores (PRD §8.4, §8.5)
-- ---------------------------------------------------------------------------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_opening_id uuid not null references public.job_openings (id) on delete cascade,
  applicant_id text not null references public.users (id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  score integer check (score is null or (score >= 0 and score <= 100)),
  notes text,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'shortlisted', 'hired', 'rejected')),
  hired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_opening_id, applicant_id)
);

create index if not exists job_applications_opening_idx on public.job_applications (job_opening_id, status, score desc nulls last);
create index if not exists job_applications_applicant_idx on public.job_applications (applicant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- verified_hires: created when admin marks 'hired' (PRD §8.6, §9.2)
-- ---------------------------------------------------------------------------
create table if not exists public.verified_hires (
  id uuid primary key default gen_random_uuid(),
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  job_opening_id uuid not null references public.job_openings (id) on delete cascade,
  applicant_id text not null references public.users (id) on delete cascade,
  employer_email text not null,
  employer_name text,
  employer_review_token text not null unique,
  reviewer_unlock_at timestamptz not null default (now() + interval '7 days'),
  review_window_end_at timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now()
);

create index if not exists verified_hires_applicant_idx on public.verified_hires (applicant_id, created_at desc);
create index if not exists verified_hires_opening_idx on public.verified_hires (job_opening_id);

-- ---------------------------------------------------------------------------
-- reviews: both Trigger A directions (PRD §9)
-- Trigger B not used in Phase 2; the column is here for Phase 4.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('verified_hire', 'member')),
  verified_hire_id uuid references public.verified_hires (id) on delete cascade,
  reviewer_id text references public.users (id) on delete set null,
  reviewer_kind text not null check (reviewer_kind in ('applicant', 'employer', 'member')),
  target_user_id text references public.users (id) on delete cascade,
  target_employer_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  evidence_url text,
  status text not null default 'live'
    check (status in ('held', 'live', 'rejected')),
  hold_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz not null default (now() + interval '14 days'),
  unique (verified_hire_id, reviewer_kind)
);

create index if not exists reviews_target_user_idx on public.reviews (target_user_id, status, created_at desc);
create index if not exists reviews_verified_hire_idx on public.reviews (verified_hire_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists hire_requests_updated_at on public.hire_requests;
create trigger hire_requests_updated_at
  before update on public.hire_requests
  for each row execute function public.set_updated_at();

drop trigger if exists job_openings_updated_at on public.job_openings;
create trigger job_openings_updated_at
  before update on public.job_openings
  for each row execute function public.set_updated_at();

drop trigger if exists job_applications_updated_at on public.job_applications;
create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny all browser access (backend uses service role)
-- ---------------------------------------------------------------------------
alter table public.hire_requests enable row level security;
alter table public.job_openings enable row level security;
alter table public.job_opening_questions enable row level security;
alter table public.job_applications enable row level security;
alter table public.verified_hires enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "deny all on hire_requests" on public.hire_requests;
create policy "deny all on hire_requests" on public.hire_requests for all using (false) with check (false);

drop policy if exists "deny all on job_openings" on public.job_openings;
create policy "deny all on job_openings" on public.job_openings for all using (false) with check (false);

drop policy if exists "deny all on job_opening_questions" on public.job_opening_questions;
create policy "deny all on job_opening_questions" on public.job_opening_questions for all using (false) with check (false);

drop policy if exists "deny all on job_applications" on public.job_applications;
create policy "deny all on job_applications" on public.job_applications for all using (false) with check (false);

drop policy if exists "deny all on verified_hires" on public.verified_hires;
create policy "deny all on verified_hires" on public.verified_hires for all using (false) with check (false);

drop policy if exists "deny all on reviews" on public.reviews;
create policy "deny all on reviews" on public.reviews for all using (false) with check (false);
