-- M6 — plan_entitlements (canonical limits, seedable) + per-user overrides.
-- See M6_SPEC.md §7.3, §4. NOTE: Free domains_active = 3 (approved product change).

create table if not exists public.plan_entitlements (
  plan            public.plan_tier primary key,
  analyses_month  integer,           -- null = unlimited
  domains_active  integer,
  pdf_month       integer,
  history_days    integer,
  ai_level        text not null default 'fallback' check (ai_level in ('fallback','grounded')),
  monitoring      text not null default 'none' check (monitoring in ('none','weekly','daily')),
  competitors_per_domain integer not null default 0,
  support         text not null default 'community',
  pdf_watermark   boolean not null default true,
  seats           integer not null default 1,
  api_access      boolean not null default false,
  sso             boolean not null default false,
  stripe_price_ids jsonb not null default '{}'::jsonb,   -- {monthly, annual}
  updated_at      timestamptz not null default now()
);

insert into public.plan_entitlements
 (plan, analyses_month, domains_active, pdf_month, history_days, ai_level, monitoring, competitors_per_domain, support, pdf_watermark, seats, api_access, sso) values
 ('free',       5,    3,    1,    30,   'fallback','none',  0,    'community', true,  1, false, false),
 ('pro',        100,  10,   50,   365,  'grounded','weekly',3,    'email',     false, 1, false, false),
 ('business',   1000, 50,   null, null, 'grounded','daily', 10,   'priority',  false, 1, false, false),
 ('enterprise', null, null, null, null, 'grounded','daily', null, 'dedicated', false, 1, true,  true)
on conflict (plan) do nothing;

alter table public.plan_entitlements enable row level security;
drop policy if exists "anyone reads plan limits" on public.plan_entitlements;
create policy "anyone reads plan limits" on public.plan_entitlements
  for select to anon, authenticated using (true);
-- writes: service role only.

-- Per-user overrides (Enterprise/custom). Partial map of the same keys.
create table if not exists public.entitlement_overrides (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  overrides jsonb not null default '{}'::jsonb,
  note      text,
  updated_at timestamptz not null default now()
);
alter table public.entitlement_overrides enable row level security;
drop policy if exists "own overrides read" on public.entitlement_overrides;
create policy "own overrides read" on public.entitlement_overrides
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- ROLLBACK:
--   drop table if exists public.entitlement_overrides;
--   drop table if exists public.plan_entitlements;
