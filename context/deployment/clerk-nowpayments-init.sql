-- Needool dev-mode schema for Clerk-synced users + NOWPayments subscriptions.
-- Run this in the Supabase SQL editor once, after `supabase-demo-state.sql`.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.

-- ---------------------------------------------------------------------------
-- users: synced from Clerk via the /api/webhooks/clerk endpoint.
-- id is the Clerk user_id (e.g. user_2ABC...). No password column - Clerk owns auth.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  name text not null default '',
  username text not null unique,
  account_type text not null default 'Individual'
    check (account_type in ('Individual', 'Business')),
  status text not null default 'inactive'
    check (status in ('inactive', 'active')),
  referral_code text not null unique,
  referred_by text,
  profile_complete boolean not null default false,
  avatar text,
  notifications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists users_referred_by_idx on public.users (referred_by);

-- ---------------------------------------------------------------------------
-- subscriptions: one row per paid period (or trial).
-- Latest row per user_id by current_period_end is the active subscription.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  plan text not null check (plan in (
    'individual_monthly',
    'individual_yearly',
    'business_monthly',
    'business_yearly',
    'trial'
  )),
  status text not null check (status in (
    'trialing', 'active', 'expired', 'cancelled'
  )),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_end_at timestamptz,
  provider text not null default 'nowpayments',
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_period_end_idx on public.subscriptions (current_period_end);
create unique index if not exists subscriptions_provider_payment_id_idx
  on public.subscriptions (provider, provider_payment_id)
  where provider_payment_id is not null;

-- ---------------------------------------------------------------------------
-- payments: NOWPayments webhook history. provider_payment_id is the idempotency key.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users (id) on delete set null,
  provider text not null default 'nowpayments',
  provider_payment_id text not null,
  order_id text,
  price_amount numeric(12, 2),
  price_currency text,
  pay_amount numeric(20, 8),
  pay_currency text,
  status text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_provider_payment_id_idx
  on public.payments (provider, provider_payment_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_order_id_idx on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses set_updated_at() from supabase-demo-state.sql)
-- ---------------------------------------------------------------------------
drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny all browser access. Backend uses the service role key.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "deny all on users" on public.users;
create policy "deny all on users" on public.users
  for all using (false) with check (false);

drop policy if exists "deny all on subscriptions" on public.subscriptions;
create policy "deny all on subscriptions" on public.subscriptions
  for all using (false) with check (false);

drop policy if exists "deny all on payments" on public.payments;
create policy "deny all on payments" on public.payments
  for all using (false) with check (false);
