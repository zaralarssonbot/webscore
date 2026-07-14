-- M7 — alerts: deterministic alerts derived from a diff. Written by the service-
-- role worker; users read their own and may only flip read_at (guard trigger).
-- See M7_SPEC.md §10, §7.4.

create table if not exists public.alerts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  domain_id      uuid not null references public.domains(id) on delete cascade,
  report_id      uuid references public.reports(id) on delete set null,
  diff_id        uuid references public.report_diffs(id) on delete set null,
  rule_key       text not null,
  severity       public.alert_severity not null,
  title          text not null,
  summary        text not null,
  ai_explanation text,
  before_value   text,
  after_value    text,
  report_url     text,
  measured_at    timestamptz,
  delivered      jsonb not null default '{}'::jsonb,
  read_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (report_id, rule_key)                  -- one alert per rule per report
);
create index if not exists alerts_user_unread_idx on public.alerts (user_id, created_at desc) where read_at is null;
create index if not exists alerts_user_idx on public.alerts (user_id, created_at desc);
create index if not exists alerts_domain_idx on public.alerts (domain_id, created_at desc);

alter table public.alerts enable row level security;
drop policy if exists "own alerts read"   on public.alerts;
drop policy if exists "own alerts update" on public.alerts;
create policy "own alerts read"   on public.alerts
  for select to authenticated using (auth.uid() = user_id);
create policy "own alerts update" on public.alerts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert/delete: service role only.

-- Guard: authenticated updates may only change read_at (mark-as-read).
create or replace function public.guard_alert_readonly()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id:=old.user_id; new.domain_id:=old.domain_id; new.report_id:=old.report_id;
    new.diff_id:=old.diff_id; new.rule_key:=old.rule_key; new.severity:=old.severity;
    new.title:=old.title; new.summary:=old.summary; new.ai_explanation:=old.ai_explanation;
    new.before_value:=old.before_value; new.after_value:=old.after_value;
    new.report_url:=old.report_url; new.measured_at:=old.measured_at;
    new.delivered:=old.delivered; new.created_at:=old.created_at;
    -- only read_at may change
  end if;
  return new;
end $$;
drop trigger if exists alerts_guard_readonly on public.alerts;
create trigger alerts_guard_readonly before update on public.alerts
  for each row execute function public.guard_alert_readonly();

-- ROLLBACK:
--   drop trigger if exists alerts_guard_readonly on public.alerts;
--   drop function if exists public.guard_alert_readonly();
--   drop table if exists public.alerts;
