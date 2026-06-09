-- Needool Phase 3A - Referral commissions, wallet summaries, withdrawals.
-- Run in Supabase SQL editor after phase-2-jobs-reviews-a.sql.
-- Backend uses SUPABASE_SERVICE_ROLE_KEY server-side; RLS denies all browser access.

-- ---------------------------------------------------------------------------
-- referral_commissions: earned on referee subscription payments (PRD §11.2)
-- ---------------------------------------------------------------------------
create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id text not null references public.users (id) on delete cascade,
  referee_id text not null references public.users (id) on delete cascade,
  payment_id text,
  provider text not null default 'nowpayments',
  provider_payment_id text not null,
  amount_usd numeric not null default 0 check (amount_usd >= 0),
  amount_usdt numeric not null default 0 check (amount_usdt >= 0),
  rate numeric not null check (rate in (0.02, 0.10)),
  referrer_status_at_payout text not null,
  status text not null default 'earned' check (status in ('earned', 'reversed')),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id, referrer_id)
);

create index if not exists referral_commissions_referrer_idx
  on public.referral_commissions (referrer_id, created_at desc);
create index if not exists referral_commissions_referee_idx
  on public.referral_commissions (referee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- withdrawals: manual USDT TRC20 payout queue (PRD §11.4)
-- ---------------------------------------------------------------------------
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  amount_usdt numeric not null check (amount_usdt >= 20),
  trc20_address text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'completed', 'rejected', 'failed')),
  admin_id text,
  tx_hash text,
  reject_reason text,
  failure_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists withdrawals_user_idx
  on public.withdrawals (user_id, created_at desc);
create index if not exists withdrawals_status_idx
  on public.withdrawals (status, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists withdrawals_updated_at on public.withdrawals;
create trigger withdrawals_updated_at
  before update on public.withdrawals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: deny all browser access (backend uses service role)
-- ---------------------------------------------------------------------------
alter table public.referral_commissions enable row level security;
alter table public.withdrawals enable row level security;

drop policy if exists "deny all on referral_commissions" on public.referral_commissions;
create policy "deny all on referral_commissions"
  on public.referral_commissions for all using (false) with check (false);

drop policy if exists "deny all on withdrawals" on public.withdrawals;
create policy "deny all on withdrawals"
  on public.withdrawals for all using (false) with check (false);
