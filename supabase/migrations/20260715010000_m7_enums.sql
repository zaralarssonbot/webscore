-- M7 (monitoring) — enums. Additive, idempotent. Shipped first.
-- See M7_SPEC.md §7.1.

do $$ begin create type public.monitor_job_status as enum
  ('queued','running','completed','partial','failed','canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.monitor_state as enum
  ('disabled','unverified','active','degraded','failing','paused'); exception when duplicate_object then null; end $$;
do $$ begin create type public.alert_severity as enum
  ('positive','info','warning','critical'); exception when duplicate_object then null; end $$;

-- Additive notification types for alerts (new values only).
alter type public.notification_type add value if not exists 'monitoring_alert';
alter type public.notification_type add value if not exists 'monitoring_positive';
alter type public.notification_type add value if not exists 'monitoring_failed';
alter type public.notification_type add value if not exists 'ssl_expiring';

-- ROLLBACK:
--   drop type if exists public.alert_severity;
--   drop type if exists public.monitor_state;
--   drop type if exists public.monitor_job_status;
--   (added notification_type values cannot be dropped in Postgres — harmless)
