-- M7 — queue claim + due-domain selector. Service-role only. The pg_cron
-- scheduling of monitor-schedule/monitor-run is done at deploy time (§20), not
-- here, so `db push` never depends on pg_cron/pg_net. See M7_SPEC.md §5, §6.

-- Atomic claim: mark up to p_limit due 'queued' jobs 'running' and return them.
-- FOR UPDATE SKIP LOCKED lets concurrent workers claim disjoint sets safely.
create or replace function public.claim_monitoring_jobs(p_limit int default 10)
returns setof public.monitoring_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.monitoring_jobs j
    set status = 'running', started_at = now(), attempt_count = j.attempt_count + 1
  where j.id in (
    select id from public.monitoring_jobs
    where status = 'queued' and scheduled_for <= now()
    order by scheduled_for asc
    for update skip locked
    limit greatest(p_limit, 1)
  )
  returning j.*;
end $$;
revoke all on function public.claim_monitoring_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_monitoring_jobs(int) to service_role;

-- Candidate domains for scheduling: verified + enabled + not paused + entitled.
-- `cadence` is the plan cadence, clamped so an override never EXCEEDS the plan
-- (rank weekly=1 < daily=2). The scheduler derives the window_key from cadence.
create or replace function public.domains_due_for_monitoring(p_limit int default 500)
returns table (id uuid, user_id uuid, normalized_domain text, cadence text)
language sql stable set search_path = public as $$
  select d.id, d.user_id, d.normalized_domain,
    case
      when d.monitoring_frequency is not null
           and (case d.monitoring_frequency when 'daily' then 2 else 1 end)
             <= (case pe.monitoring when 'daily' then 2 else 1 end)
        then d.monitoring_frequency
      else pe.monitoring
    end as cadence
  from public.domains d
  join public.profiles pr on pr.id = d.user_id
  join public.plan_entitlements pe on pe.plan = pr.plan
  where d.monitoring_enabled = true
    and d.verified = true
    and d.verified_at is not null
    and d.is_archived = false
    and coalesce(d.monitoring_paused, false) = false
    and pe.monitoring <> 'none'
  order by coalesce(d.next_scheduled_at, to_timestamp(0)) asc
  limit greatest(p_limit, 1);
$$;
revoke all on function public.domains_due_for_monitoring(int) from public, anon, authenticated;
grant execute on function public.domains_due_for_monitoring(int) to service_role;

-- ROLLBACK:
--   drop function if exists public.domains_due_for_monitoring(int);
--   drop function if exists public.claim_monitoring_jobs(int);
