-- M7 — monitoring_runs: append-only observability metrics per worker run.
-- Service role only (no user policies). See M7_SPEC.md §19, §7.5.

create table if not exists public.monitoring_runs (
  id            bigint generated always as identity primary key,
  job_id        uuid references public.monitoring_jobs(id) on delete set null,
  domain_id     uuid,
  outcome       text not null,                 -- 'completed' | 'partial' | 'failed'
  duration_ms   integer,
  attempt       integer,
  upstream      jsonb not null default '{}'::jsonb,   -- {crawl,pagespeed,ssl}
  alerts_created integer not null default 0,
  emails_sent   integer not null default 0,
  cost_units    integer not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists monitoring_runs_created_idx on public.monitoring_runs (created_at desc);
create index if not exists monitoring_runs_domain_idx on public.monitoring_runs (domain_id, created_at desc);

alter table public.monitoring_runs enable row level security;  -- no policies → service role only

-- ROLLBACK:
--   drop table if exists public.monitoring_runs;
