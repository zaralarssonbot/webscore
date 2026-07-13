-- M6 — make the domain cap entitlement-driven. Controlled additive evolution of
-- the M5 enforce_domain_limit() (was hardcoded 25). The trigger binding
-- (domains_enforce_limit) is UNCHANGED — only the function body is replaced.
-- See M6_SPEC.md §7.6. Safe: accounts shipped dark (0 real users at M6 start).

create or replace function public.enforce_domain_limit()
returns trigger language plpgsql set search_path = public as $$
declare cap integer; cnt integer; usr_plan public.plan_tier;
begin
  if new.is_archived then return new; end if;

  select plan into usr_plan from public.profiles where id = new.user_id;
  select domains_active into cap from public.plan_entitlements where plan = coalesce(usr_plan, 'free');

  -- Per-user override wins when present.
  select coalesce((eo.overrides->>'domains_active')::int, cap) into cap
    from public.entitlement_overrides eo where eo.user_id = new.user_id;

  if cap is null then return new; end if;   -- unlimited

  select count(*) into cnt from public.domains
    where user_id = new.user_id and is_archived = false;
  if cnt >= cap then
    raise exception 'domain_limit_reached'
      using errcode = 'check_violation', hint = format('Din plan tillåter %s aktiva domäner.', cap);
  end if;
  return new;
end $$;

-- ROLLBACK: restore the M5 constant-25 body (see 20260713040000_domains.sql).
