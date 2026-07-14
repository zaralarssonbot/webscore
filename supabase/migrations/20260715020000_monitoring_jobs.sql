-- M7 — monitoring_jobs: the durable, idempotent job queue.
-- Written only by service-role scheduler/worker. See M7_SPEC.md §6, §7.2.

create table if not exists public.monitoring_jobs (
  id                uuid primary key default gen_random_uuid(),
  domain_id         uuid not null references public.domains(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  window_key        text not null,                         -- 'weekly:2026-W29' | 'daily:2026-07-14' | 'manual:<uuid>'
  status            public.monitor_job_status not null default 'queued',
  trigger_source    text not null default 'scheduled' check (trigger_source in ('scheduled','manual','retry')),
  scheduled_for     timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  attempt_count     integer not null default 0,
  next_attempt_at   timestamptz,
  last_error        text,
  report_id         uuid references public.reports(id) on delete set null,
  analysis_version  text,
  scoring_version   text,
  created_at        timestamptz not null default now(),
  unique (domain_id, window_key)                            -- idempotency: one job per domain per window
);
create index if not exists monitoring_jobs_claim_idx  on public.monitoring_jobs (status, scheduled_for);
create index if not exists monitoring_jobs_domain_idx  on public.monitoring_jobs (domain_id, created_at desc);
create index if not exists monitoring_jobs_user_idx    on public.monitoring_jobs (user_id, created_at desc);

alter table public.monitoring_jobs enable row level security;
drop policy if exists "own jobs read" on public.monitoring_jobs;
create policy "own jobs read" on public.monitoring_jobs
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- ROLLBACK:
--   drop table if exists public.monitoring_jobs;
