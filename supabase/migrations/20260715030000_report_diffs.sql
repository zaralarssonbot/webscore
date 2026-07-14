-- M7 — report_diffs: the structured, deterministic diff between the new report
-- and the previous completed one. Written only by the service-role worker.
-- See M7_SPEC.md §9, §7.3.

create table if not exists public.report_diffs (
  id             uuid primary key default gen_random_uuid(),
  domain_id      uuid not null references public.domains(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  report_id      uuid not null references public.reports(id) on delete cascade,   -- the NEW report
  prev_report_id uuid references public.reports(id) on delete set null,           -- the baseline
  overall_delta  integer,
  category_deltas jsonb not null default '{}'::jsonb,
  checks         jsonb not null default '{}'::jsonb,     -- {new_failed:[], resolved:[], changed:[]}
  pagespeed_deltas jsonb not null default '{}'::jsonb,
  metadata_changes jsonb not null default '{}'::jsonb,   -- {title:{before,after}, canonical, robots, h1}
  content_changes  jsonb not null default '{}'::jsonb,
  ssl            jsonb,                                   -- {expires_at, days_left}
  has_material_change boolean not null default false,
  measured_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (report_id)                                     -- one diff per new report
);
create index if not exists report_diffs_domain_idx on public.report_diffs (domain_id, created_at desc);

alter table public.report_diffs enable row level security;
drop policy if exists "own diffs read" on public.report_diffs;
create policy "own diffs read" on public.report_diffs
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- ROLLBACK:
--   drop table if exists public.report_diffs;
