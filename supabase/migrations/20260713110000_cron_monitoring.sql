-- M5 — scheduled monitoring support. See M5_SPEC.md §15.6, §18.1 (enable last).
--
-- The heavy lifting (crawl + score + save) lives in the rescan-domain Edge
-- Function. This migration provides the pure, testable SELECT of "which domains
-- are due" and an OPTIONAL pg_cron schedule that pokes the rescan-due function.
-- The pg_cron block is guarded so `db push` never fails when pg_cron/pg_net are
-- not enabled on the project — enable the schedule from the dashboard when the
-- monitoring path has been verified end-to-end.

-- Verified, monitoring-enabled domains not analyzed within the cadence (7 days).
create or replace function public.domains_due_for_rescan(p_limit integer default 50)
returns table (id uuid, user_id uuid, normalized_domain text)
language sql stable set search_path = public as $$
  select d.id, d.user_id, d.normalized_domain
  from public.domains d
  where d.monitoring_enabled = true
    and d.verified = true
    and d.verified_at is not null
    and d.is_archived = false
    and (d.last_analyzed_at is null or d.last_analyzed_at < now() - interval '7 days')
  order by d.last_analyzed_at asc nulls first
  limit greatest(p_limit, 1);
$$;
revoke all on function public.domains_due_for_rescan(integer) from anon, authenticated;

-- Retention sweep: prune read/old notifications (>180d) and stale rate-limit
-- windows (>2d). Idempotent; safe to call from cron or by hand.
create or replace function public.m5_maintenance_sweep()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications where created_at < now() - interval '180 days';
  delete from public.rate_limits   where window_start < now() - interval '2 days';
end $$;
revoke all on function public.m5_maintenance_sweep() from anon, authenticated;

-- Optional pg_cron schedule — guarded so absence of pg_cron/pg_net is non-fatal.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Daily maintenance sweep at 03:15 UTC.
    perform cron.schedule(
      'm5-maintenance-sweep', '15 3 * * *',
      $cron$ select public.m5_maintenance_sweep(); $cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;

-- NOTE: the hourly rescan trigger (which must call the rescan-due Edge Function
-- over HTTP via pg_net, or be a Supabase scheduled function) is configured in
-- the dashboard once monitoring is verified. domains_due_for_rescan() is the
-- authoritative queue it should consume.

-- ROLLBACK:
--   do $$ begin
--     if exists (select 1 from pg_extension where extname='pg_cron') then
--       perform cron.unschedule('m5-maintenance-sweep');
--     end if;
--   exception when others then null; end $$;
--   drop function if exists public.m5_maintenance_sweep();
--   drop function if exists public.domains_due_for_rescan(integer);
