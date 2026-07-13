-- M6 fix — the entitlement-aware enforce_domain_limit() nulled `cap` for every
-- user WITHOUT an entitlement_overrides row: `SELECT ... INTO cap` with no
-- matching row sets the target to NULL in PL/pgSQL, which the `cap is null`
-- unlimited-check then treated as unlimited. Use a separate override variable
-- and only apply it when present. Found during production verification (Free
-- users could add unlimited domains). See M6_SPEC.md §7.6.

create or replace function public.enforce_domain_limit()
returns trigger language plpgsql set search_path = public as $$
declare cap integer; ov_cap integer; cnt integer; usr_plan public.plan_tier;
begin
  if new.is_archived then return new; end if;

  select plan into usr_plan from public.profiles where id = new.user_id;
  select domains_active into cap from public.plan_entitlements where plan = coalesce(usr_plan, 'free');

  -- Per-user override: apply ONLY when an override row/value actually exists,
  -- so a missing row never nulls the plan cap.
  select (eo.overrides->>'domains_active')::int into ov_cap
    from public.entitlement_overrides eo where eo.user_id = new.user_id;
  if ov_cap is not null then cap := ov_cap; end if;

  if cap is null then return new; end if;   -- unlimited (Enterprise / override)

  select count(*) into cnt from public.domains
    where user_id = new.user_id and is_archived = false;
  if cnt >= cap then
    raise exception 'domain_limit_reached'
      using errcode = 'check_violation', hint = format('Din plan tillåter %s aktiva domäner.', cap);
  end if;
  return new;
end $$;

-- ROLLBACK: restore the M5 constant-25 body (20260713040000_domains.sql).
