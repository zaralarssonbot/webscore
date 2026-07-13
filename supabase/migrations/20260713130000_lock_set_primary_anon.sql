-- M5 hardening (follow-up): Supabase default privileges grant EXECUTE directly
-- to anon/authenticated/service_role on every new public function. set_primary_
-- domain therefore retained a DIRECT anon grant that revoking PUBLIC did not
-- remove. It is SECURITY INVOKER (RLS makes it a harmless no-op for anon), but
-- it should not be callable by anon at all. Explicitly revoke the anon grant.

revoke execute on function public.set_primary_domain(uuid) from anon;

-- ROLLBACK:
--   grant execute on function public.set_primary_domain(uuid) to anon;
