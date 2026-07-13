-- M6 — make the monitoring queue plan-aware. Controlled additive evolution of
-- the M5 domains_due_for_rescan() (trigger/cron binding unchanged). Excludes
-- plans with monitoring='none' and picks the cadence per plan (weekly/daily).
-- See M6_SPEC.md §4, §8.3.

create or replace function public.domains_due_for_rescan(p_limit integer default 50)
returns table (id uuid, user_id uuid, normalized_domain text)
language sql stable set search_path = public as $$
  select d.id, d.user_id, d.normalized_domain
  from public.domains d
  join public.profiles pr on pr.id = d.user_id
  join public.plan_entitlements pe on pe.plan = pr.plan
  where d.monitoring_enabled = true
    and d.verified = true
    and d.verified_at is not null
    and d.is_archived = false
    and pe.monitoring <> 'none'
    and (d.last_analyzed_at is null
         or d.last_analyzed_at <
            now() - (case pe.monitoring when 'daily' then interval '1 day' else interval '7 days' end))
  order by d.last_analyzed_at asc nulls first
  limit greatest(p_limit, 1);
$$;
-- Re-assert the lockdown (CREATE OR REPLACE preserves grants, but be explicit).
revoke all on function public.domains_due_for_rescan(integer) from public, anon, authenticated;
grant execute on function public.domains_due_for_rescan(integer) to service_role;

-- ROLLBACK: restore the M5 body (20260713110000 / 20260713120000).
