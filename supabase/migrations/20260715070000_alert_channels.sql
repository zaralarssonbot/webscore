-- M7 — alert channel prefs (user_settings) + alert channel entitlements
-- (plan_entitlements). Additive. See M7_SPEC.md §7.7, §11, §14.

alter table public.user_settings add column if not exists notify_monitoring_alerts boolean not null default true;
alter table public.user_settings add column if not exists alert_email_enabled boolean not null default true;
alter table public.user_settings add column if not exists alert_webhook_url text;       -- future-ready
alter table public.user_settings add column if not exists alert_webhook_secret text;     -- HMAC signing (future)

alter table public.plan_entitlements add column if not exists alert_email boolean not null default false;
alter table public.plan_entitlements add column if not exists alert_webhook boolean not null default false;
alter table public.plan_entitlements add column if not exists manual_reruns_day integer;  -- null = unlimited

update public.plan_entitlements set alert_email=false, alert_webhook=false, manual_reruns_day=0    where plan='free';
update public.plan_entitlements set alert_email=true,  alert_webhook=false, manual_reruns_day=6    where plan='pro';
update public.plan_entitlements set alert_email=true,  alert_webhook=true,  manual_reruns_day=24   where plan='business';
update public.plan_entitlements set alert_email=true,  alert_webhook=true,  manual_reruns_day=null where plan='enterprise';

-- ROLLBACK:
--   alter table public.plan_entitlements drop column if exists manual_reruns_day, drop column if exists alert_webhook, drop column if exists alert_email;
--   alter table public.user_settings drop column if exists alert_webhook_secret, drop column if exists alert_webhook_url, drop column if exists alert_email_enabled, drop column if exists notify_monitoring_alerts;
