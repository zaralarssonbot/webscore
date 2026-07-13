-- M6 (payments) — enums. Additive, idempotent. Shipped first (ALTER TYPE ADD
-- VALUE must not be used in the same statement batch that references the value).
-- See M6_SPEC.md §7.1.

do $$ begin
  create type public.plan_tier as enum ('free','pro','business','enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum
    ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused');
exception when duplicate_object then null; end $$;

-- Additive notification types (append to the M5 enum — new values only).
alter type public.notification_type add value if not exists 'trial_ending';
alter type public.notification_type add value if not exists 'payment_failed';
alter type public.notification_type add value if not exists 'subscription_renewed';
alter type public.notification_type add value if not exists 'invoice_available';
alter type public.notification_type add value if not exists 'plan_upgraded';
alter type public.notification_type add value if not exists 'plan_downgraded';

-- ROLLBACK:
--   drop type if exists public.subscription_status;
--   drop type if exists public.plan_tier;
--   (added notification_type values cannot be dropped in Postgres — harmless if unused)
