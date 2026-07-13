# M5 Deployment Runbook

M5 is **code-complete and gate-passing** on branch `claude/webscore-asset-structure-a0s2gz`
(tsc clean · 91 tests · build+prerender 13 routes · additive-only). It ships **dark**:
until `VITE_ACCOUNTS_ENABLED=true`, the public M1–M4 site is byte-identical.

Deployment touches the **production Supabase project and DNS** — run these steps
deliberately (ideally against a Supabase preview branch first). Order matters (§18.1).

## 1. Database migrations (idempotent, additive)
```bash
supabase db push        # applies supabase/migrations/20260713*.sql in order
```
Verify: `profiles, user_settings, domains, notifications, audit_log, rate_limits`
exist; `reports` has `user_id, domain_id, title`; the M2 public-read policy is
still present alongside the new `owners read own reports`.

## 2. Regenerate types (optional; project convention omits new tables)
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```
(Account services already cast at the boundary, so this is cosmetic.)

## 3. Edge Functions
```bash
supabase functions deploy save-report          # additive ownership path
supabase functions deploy claim-report
supabase functions deploy verify-domain
supabase functions deploy export-account-data
supabase functions deploy delete-account
supabase functions deploy rescan-domain
```
Secrets: `IP_HASH_PEPPER` (any random string), `CRON_SECRET` (for rescan-domain).
Existing secrets (SUPABASE_URL / SERVICE_ROLE / ANON, PDF_RENDER_*) unchanged.

## 4. Supabase Auth config (dashboard)
- Site URL `https://webscore.se`; add redirect URLs `https://webscore.se/auth/callback`,
  the Cloudflare preview domain, and `http://localhost:5173/auth/callback` (dev).
- Enable **Email OTP** (magic link); brand the template (Swedish).
- Enable **Google** provider (client id/secret).

## 5. Frontend (Cloudflare Pages) — ship dark first
- Deploy the branch with `VITE_ACCOUNTS_ENABLED` **unset/false**.
- Smoke-test the public path: anonymous analyze → `/analys/:id` → PDF unchanged.

## 6. Flip the flag (after DoD §19 passes)
- Set `VITE_ACCOUNTS_ENABLED=true`, redeploy. Accounts UI + entry points appear.

## 7. Enable monitoring cron (last)
- Enable `pg_cron`/`pg_net`; schedule an hourly job that reads
  `public.domains_due_for_rescan()` and POSTs each to the `rescan-domain` function
  with header `x-webscore-cron: $CRON_SECRET`. The daily `m5_maintenance_sweep`
  is already scheduled by migration when pg_cron is present.

## Rollback
- **Instant:** `VITE_ACCOUNTS_ENABLED=false` + redeploy → accounts vanish, DB intact.
- **Functions:** redeploy previous `save-report`; new functions are inert if unused.
- **DB:** run the `-- ROLLBACK:` block in each migration in reverse order (drop the
  `on_auth_user_created` trigger first). Public reports survive (revert to anonymous).

## Post-deploy verification (DoD gates, §19)
Two real accounts: cross-tenant reads return nothing; add+verify a domain;
analyze → appears in dashboard/history/trends; notification fires; export + delete
a throwaway account. Confirm the Cloudflare bundle actually propagated (known
M3/M4 lag — check the build log).
