-- M6 — stripe_customers + subscription_events (webhook idempotency/replay log).
-- Written only by service-role functions. See M6_SPEC.md §7.2, §10.

create table if not exists public.stripe_customers (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
drop policy if exists "own customer read" on public.stripe_customers;
create policy "own customer read" on public.stripe_customers
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only (no insert/update/delete policy).

-- Append-only webhook log → idempotency + replay protection + audit.
create table if not exists public.subscription_events (
  id              bigint generated always as identity primary key,
  stripe_event_id text not null unique,          -- replay guard
  type            text not null,
  user_id         uuid references auth.users(id) on delete set null,
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz
);
create index if not exists subscription_events_type_idx on public.subscription_events (type, received_at desc);
alter table public.subscription_events enable row level security;  -- no policies → service role only

-- ROLLBACK:
--   drop table if exists public.subscription_events;
--   drop table if exists public.stripe_customers;
