-- Restrict reading lead data (emails, domains, scores) to authenticated admins.
--
-- Previously "Anyone can view leads" (USING true) made every lead readable with
-- the public anon key — i.e. customer emails/domains were exposed to anyone,
-- regardless of the /admin UI. The public site does NOT need to read leads:
--   • capture happens via INSERT ("Anyone can insert leads")
--   • status transitions happen via UPDATE-by-id ("Anyone can update leads")
-- The only client-side reader is autoScheduleFollowUp() -> findLeadByScanId(),
-- which degrades gracefully to a no-op when SELECT is filtered for anon users.
--
-- NOTE: apply with `supabase db push`. An admin user must exist in Supabase Auth
-- (email/password) for the /admin dashboard to read leads after this change.

DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;

CREATE POLICY "Authenticated can view leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);
