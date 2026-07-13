-- M6 — subscriptions (Stripe mirror) + usage_counters + invoices.
-- Writes are service-role only (webhook/checkout); users read their own.
-- See M6_SPEC.md §7.4, §8.5.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  plan                   public.plan_tier not null default 'free',
  status                 public.subscription_status not null default 'active',
  price_id               text,
  interval               text check (interval in ('month','year')),
  quantity               integer not null default 1,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_end              timestamptz,
  grace_until            timestamptz,               -- past_due grace window end
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_period_end_idx on public.subscriptions (current_period_end);
alter table public.subscriptions enable row level security;
drop policy if exists "own subscription read" on public.subscriptions;
create policy "own subscription read" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

create table if not exists public.usage_counters (
  user_id      uuid not null references auth.users(id) on delete cascade,
  metric       text not null,                -- 'analyses_month' | 'pdf_month'
  period_start date not null,
  count        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, metric, period_start)
);
create index if not exists usage_counters_lookup on public.usage_counters (user_id, metric, period_start);
alter table public.usage_counters enable row level security;
drop policy if exists "own usage read" on public.usage_counters;
create policy "own usage read" on public.usage_counters
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- Atomic usage increment; returns the new count. Service role only.
create or replace function public.bump_usage(p_user uuid, p_metric text, p_period date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.usage_counters(user_id, metric, period_start, count)
  values (p_user, p_metric, p_period, 1)
  on conflict (user_id, metric, period_start)
  do update set count = usage_counters.count + 1, updated_at = now()
  returning usage_counters.count into n;
  return n;
end $$;
revoke all on function public.bump_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.bump_usage(uuid, text, date) to service_role;

-- Minimal invoice mirror for the billing page.
create table if not exists public.invoices (
  id                 text primary key,        -- stripe invoice id
  user_id            uuid references auth.users(id) on delete cascade,
  number             text,
  status             text,
  amount_due         integer,
  amount_paid        integer,
  currency           text,
  hosted_invoice_url text,
  invoice_pdf        text,
  period_start       timestamptz,
  created            timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices (user_id, created desc);
alter table public.invoices enable row level security;
drop policy if exists "own invoices read" on public.invoices;
create policy "own invoices read" on public.invoices
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- ROLLBACK:
--   drop table if exists public.invoices;
--   drop function if exists public.bump_usage(uuid, text, date);
--   drop table if exists public.usage_counters;
--   drop table if exists public.subscriptions;
