-- M5 hardening: PostgreSQL grants EXECUTE to PUBLIC by default, so the earlier
-- `revoke ... from anon, authenticated` was insufficient — anon could still call
-- these via the PUBLIC grant. Revoke from PUBLIC and grant only the intended
-- roles. Only RPC-callable functions (scalar/table/void return) are exposed by
-- PostgREST; trigger functions (returning `trigger`) cannot be called via RPC.
--
-- Found during production verification: anon could call bump_rate_limit
-- (SECURITY DEFINER write) and m5_maintenance_sweep (SECURITY DEFINER delete).

revoke execute on function public.bump_rate_limit(text, text, timestamptz) from public;
grant  execute on function public.bump_rate_limit(text, text, timestamptz) to service_role;

revoke execute on function public.domains_due_for_rescan(integer) from public;
grant  execute on function public.domains_due_for_rescan(integer) to service_role;

revoke execute on function public.m5_maintenance_sweep() from public;
grant  execute on function public.m5_maintenance_sweep() to service_role;

-- set_primary_domain is SECURITY INVOKER (RLS still applies) but should only be
-- reachable by signed-in users, not anon.
revoke execute on function public.set_primary_domain(uuid) from public;
grant  execute on function public.set_primary_domain(uuid) to authenticated, service_role;

-- ROLLBACK:
--   grant execute on function public.bump_rate_limit(text,text,timestamptz) to public;
--   grant execute on function public.domains_due_for_rescan(integer) to public;
--   grant execute on function public.m5_maintenance_sweep() to public;
--   grant execute on function public.set_primary_domain(uuid) to public;
