-- Needool Phase 4D-1 — Signup field capture (PRD §2.3, §2.4, §2.7).
-- Run in Supabase SQL editor after phase-4c-trigger-b.sql.
-- Adds the demographic + contact fields the PRD requires at signup. RLS deny-all
-- stays in place; backend service role writes these via the Clerk webhook.

-- ---------------------------------------------------------------------------
-- Individual fields (PRD §2.3) — all immutable once set per §2.6.
--   • First / middle / last name as on government ID
--   • Sex, nationality
--   • Date of birth (must be 18+) — enforced server-side
--   • Phone, WhatsApp
--   • Country / state / city of residence (already covered by §2.4 columns
--     below, reused for Individual residence as well)
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists first_name      text,
  add column if not exists middle_name     text,
  add column if not exists last_name       text,
  add column if not exists sex             text check (sex in ('Male','Female','Other') or sex is null),
  add column if not exists nationality     text,
  add column if not exists date_of_birth   date,
  add column if not exists phone           text,
  add column if not exists whatsapp        text,
  add column if not exists country         text,
  add column if not exists state           text,
  add column if not exists city            text;

-- ---------------------------------------------------------------------------
-- Business fields (PRD §2.4) — all immutable once set.
--   • Legal organization name (already stored in users.name for Business
--     accounts; kept there to avoid duplicate truth-of-record).
--   • Business address (street/line1)
--   • Country / state / city — reuses the columns above.
--   • Headquarters or branch designation. If branch, HQ full address required.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists business_address     text,
  add column if not exists office_type          text check (office_type in ('HQ','Branch') or office_type is null),
  add column if not exists hq_address           text,
  add column if not exists hq_country           text,
  add column if not exists hq_state             text,
  add column if not exists hq_city              text;

-- ---------------------------------------------------------------------------
-- Indexes useful for §4 search and §2.7 referrer attribution
-- ---------------------------------------------------------------------------
create index if not exists users_country_state_city_idx
  on public.users (country, state, city);

create index if not exists users_referred_by_idx
  on public.users (referred_by) where referred_by is not null;
