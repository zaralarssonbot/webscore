-- M6 — profiles.plan cache (advisory; authoritative = subscriptions). Maintained
-- by stripe-webhook. A guard trigger stops clients self-setting their plan.
-- See M6_SPEC.md §7.5, §10.

alter table public.profiles add column if not exists plan public.plan_tier not null default 'free';
create index if not exists profiles_plan_idx on public.profiles (plan);

-- The M5 "own profile update" policy lets a user update their own row; block the
-- plan column for non-service_role writers (revert to the stored value).
create or replace function public.guard_profile_plan()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_plan on public.profiles;
create trigger profiles_guard_plan
  before update on public.profiles
  for each row execute function public.guard_profile_plan();

-- ROLLBACK:
--   drop trigger if exists profiles_guard_plan on public.profiles;
--   drop function if exists public.guard_profile_plan();
--   alter table public.profiles drop column if exists plan;
