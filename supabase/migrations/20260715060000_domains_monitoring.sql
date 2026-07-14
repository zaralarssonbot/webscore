-- M7 — additive monitoring columns on the FROZEN M5 domains table + extend the
-- column-guard so clients cannot write any server-owned monitoring field. All
-- pause/resume/frequency mutations go through the update-monitoring function
-- (service role). See M7_SPEC.md §7.6, §8, §13.

alter table public.domains add column if not exists monitoring_frequency text
  check (monitoring_frequency in ('weekly','daily'));           -- null = plan default
alter table public.domains add column if not exists monitoring_paused boolean not null default false;
alter table public.domains add column if not exists monitoring_state public.monitor_state not null default 'disabled';
alter table public.domains add column if not exists next_scheduled_at timestamptz;
alter table public.domains add column if not exists last_success_at timestamptz;
alter table public.domains add column if not exists last_failure_at timestamptz;
alter table public.domains add column if not exists consecutive_failures integer not null default 0;
alter table public.domains add column if not exists ssl_expires_at timestamptz;
alter table public.domains add column if not exists ssl_last_checked_at timestamptz;
create index if not exists domains_ssl_expiry_idx on public.domains (ssl_expires_at) where ssl_expires_at is not null;

-- Extend the M5/M6 domain column-guard (create or replace; trigger binding
-- unchanged) to also revert the new server-owned monitoring columns for any
-- non-service-role writer.
create or replace function public.guard_domain_server_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    -- M5/M6 protected columns
    new.verified            := old.verified;
    new.verified_at         := old.verified_at;
    new.verification_method := old.verification_method;
    new.verification_token  := old.verification_token;
    new.monitoring_enabled  := old.monitoring_enabled;
    new.latest_report_id    := old.latest_report_id;
    new.latest_score        := old.latest_score;
    new.last_analyzed_at    := old.last_analyzed_at;
    -- M7 protected columns
    new.monitoring_frequency   := old.monitoring_frequency;
    new.monitoring_paused      := old.monitoring_paused;
    new.monitoring_state       := old.monitoring_state;
    new.next_scheduled_at      := old.next_scheduled_at;
    new.last_success_at        := old.last_success_at;
    new.last_failure_at        := old.last_failure_at;
    new.consecutive_failures   := old.consecutive_failures;
    new.ssl_expires_at         := old.ssl_expires_at;
    new.ssl_last_checked_at    := old.ssl_last_checked_at;
  end if;
  return new;
end $$;

-- ROLLBACK: restore the M6 guard body (20260713090000 / 20260714*) and drop the
-- added columns (reverse order).
