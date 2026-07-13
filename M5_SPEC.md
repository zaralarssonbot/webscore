# M5 — Accounts, Dashboard, History & Domain Management

**Status:** Specification (blueprint only — not implemented)
**Author:** Engineering
**Depends on (frozen):** M1 analysis hardening · M2 shareable reports · M3 AI insights · M4 PDF reports
**Constraint:** M5 is **strictly additive**. No frozen M1–M4 table, column, RLS policy, Edge Function, or route may be modified unless a *critical production bug* is found. Every M5 change is a new migration, new function, new column (nullable), new route, or new policy that coexists with what exists.

---

## 0. Audit of the current system (pre-work)

### 0.1 What already exists and is frozen

| Area | Artifact | M5 reuse |
| --- | --- | --- |
| Frontend | Vite + React 18 + TS, shadcn/ui, Tailwind, react-router-dom v6, @tanstack/react-query, **recharts**, react-hook-form, zod, framer-motion | Reuse all. Charts → recharts. Forms → react-hook-form + zod. Data → react-query. **`src/components/ui/sidebar.tsx` already present** → dashboard shell. |
| Auth runtime | `@supabase/supabase-js` client with `persistSession`, `autoRefreshToken`, `localStorage` (`src/integrations/supabase/client.ts`) | Reuse verbatim. Only add an `AuthProvider` + `redirectTo` config; the client is already correct. |
| Auth usage today | `/admin` email+password for a single internal admin (`src/pages/Admin.tsx`) | Untouched. M5 introduces a *separate* customer account system; the admin gate stays as-is. |
| DB — public reports | `public.reports` (M2): `id` uuid = public token, `normalized_domain`, `final_score`, `category_scores`, `status`, `report_data` jsonb, `is_public`, `measured_at`, `expires_at`, `pdf_path`, `pdf_generated_at`. RLS: single SELECT policy `is_public and not expired` for anon/auth; **no write policies** (service-role only). | Add nullable `user_id`, `domain_id`, `title`. Add an **additive** owner-read policy. Never remove the public-token policy. |
| DB — measurement cache | `public.analysis_cache` (service-role only) | Reuse for scoring parity. Re-scans read/write it exactly as today. |
| DB — AI log | `public.ai_reports` (append-only, versioned) | Reuse. No change. |
| DB — leads | `public.leads` (admin-only SELECT) | Untouched. Separate from customer accounts. |
| Storage | private `report-pdfs` bucket, signed URLs, no public policy | Reuse. Add a private `avatars` bucket for profile images (optional, see §13). |
| Edge functions | `analyze-website`, `save-report`, `render-pdf`, `find-competitors`, `google-business-lookup`, `lookup-company`, `screenshot-website` | Reuse. `save-report` gets an **optional, additive** ownership-attach path (JWT-gated). New functions added alongside. |
| Normalization | `canonicalDomain()` (scheme/www/path/port stripped, lowercased) duplicated in `analyze-website` + `save-report` | M5 **must** reuse the identical function for `domains.normalized_domain` so a domain row, its cache entry, and its reports always share one key. |
| Deploy | Cloudflare Pages (frontend) + Supabase CLI (`db push`, `functions deploy`). SPA fallback `public/_redirects`. Prerender via `scripts/prerender.mjs`. | Reuse. New authed routes are client-only (no prerender, `noindex`). |

### 0.2 What does NOT exist and must be built

- No `profiles`, `domains`, `notifications`, `user_settings`, `audit_log`, `rate_limits` tables.
- No ownership column anywhere — reports/analyses are fully anonymous.
- No magic-link or OAuth flow, no auth context, no protected routing, no logout for customers.
- No dashboard, history, trends, domain management, search, notifications, settings, or GDPR surfaces.

### 0.3 Load-bearing decisions forced by the audit

1. **Reports stay anonymous-by-default.** Adding `user_id` nullable + an *additional* owner policy means existing anonymous public reports keep resolving by token with zero behavior change. This is the single most important compatibility guarantee in M5.
2. **Ownership is attached server-side, never trusted from the client** — same discipline as the deterministic score. The `user_id` is read from the verified JWT inside the Edge Function, not from the request body.
3. **History and trends require no new "events" table.** A user's history *is* their `reports` rows filtered by `domain_id`/`user_id` and ordered by `measured_at`. Score-delta for notifications is computed by comparing the new report to the previous latest report for the same domain at save time.
4. **Domain verification is a security boundary, not a formality.** Unverified domains may be analyzed on demand (same as anonymous today); **scheduled monitoring and trend accrual for a domain require verified ownership** to prevent using Webscore as a free competitor-surveillance / scan-amplification engine.

---

## 1. Vision

Turn Webscore from a one-shot report generator into a **persistent SaaS workspace**. A visitor still gets an instant anonymous report (unchanged). But by creating an account they gain:

- **Accounts** — passwordless (magic link) or Google sign-in; a durable identity that owns work.
- **Dashboard** — a single glance at every monitored domain, its latest score, its trend arrow, and what changed.
- **History** — the full timeline of every analysis, report, PDF, and AI insight per domain, versioned and immutable.
- **Domain Management** — add / verify / favorite / archive / set-primary across many domains.
- **Trend analytics** — overall + per-category (Performance, SEO, UX/Conversion, Trust, Security) over time.
- **Notifications, search, settings, GDPR self-service.**

Design language inherits the frozen visual identity (calibration-ring logo, calm CSS-only motion, premium easing, dark surface). No redesign — extend the existing component vocabulary.

**Non-goals for M5:** billing/subscriptions, teams/multi-seat/roles, white-label, public API, changing the analysis or scoring engines.

---

## 2. Architecture

### 2.1 System shape

```
                       ┌────────────────────────────────────────────┐
                       │  Cloudflare Pages (SPA, existing)          │
                       │  Public routes (unchanged) + /app/* (new)  │
                       │  AuthProvider · react-query · recharts     │
                       └───────────────┬────────────────────────────┘
                                       │ supabase-js (anon key + user JWT)
                       ┌───────────────▼────────────────────────────┐
                       │  Supabase                                   │
                       │  ┌─────────────┐  ┌──────────────────────┐  │
                       │  │ Auth (GoTrue)│  │ Postgres + RLS       │  │
                       │  │ magic link   │  │ profiles, domains,   │  │
                       │  │ Google OAuth │  │ reports(+user_id),   │  │
                       │  └─────────────┘  │ notifications, ...    │  │
                       │  ┌─────────────┐  └──────────────────────┘  │
                       │  │ Edge (Deno) │  ┌──────────────────────┐  │
                       │  │ save-report*│  │ Storage: report-pdfs │  │
                       │  │ claim-report│  │          avatars     │  │
                       │  │ verify-domain│ └──────────────────────┘  │
                       │  │ export/delete-account, rescan-domain     │  │
                       │  └─────────────┘  pg_cron → scheduled rescan │
                       └─────────────────────────────────────────────┘
     * = existing function, additively extended
```

### 2.2 Data-access rules (invariants)

- **Reads** happen directly from the browser via RLS-protected `select` (fast, cache-friendly with react-query). RLS is the *only* thing standing between user A and user B's data — it must be provably correct (§5, §17).
- **Privileged writes** (attach ownership, mint reports, verify a domain, insert notifications, delete an account) happen only in Edge Functions using the service role. The client never writes `reports`, `notifications`, `audit_log`.
- **User-owned mutable rows** (`domains`, `profiles`, `user_settings`, notification read-state) are written **directly from the client** under strict `user_id = auth.uid()` RLS — these are low-risk, user-scoped, and don't need a function.

### 2.3 Frontend architecture

- **`AuthProvider`** (`src/context/AuthContext.tsx`): wraps `supabase.auth`, exposes `{ user, session, loading, signInWithMagicLink, signInWithGoogle, signOut }`. Subscribes to `onAuthStateChange`, hydrates from `getSession()`. Single source of auth truth.
- **`ProtectedRoute`** (`src/components/auth/ProtectedRoute.tsx`): gate for `/app/*`. While `loading` → skeleton; unauthenticated → redirect `/login?next=<path>`.
- **Dashboard shell** (`src/app/AppLayout.tsx`): uses existing `ui/sidebar.tsx`. Left nav (Dashboard, Domains, History, Settings), top bar (search, notifications bell, account menu). `<Outlet/>` for pages.
- **Data layer** (`src/lib/account/*.ts`): thin typed service modules (`profile-service`, `domain-service`, `history-service`, `trend-service`, `notification-service`) mirroring `report-service.ts` style — pure functions returning discriminated unions, all errors swallowed into typed states, never throw into the UI.
- **Query keys**: `['domains', userId]`, `['reports', domainId]`, `['trend', domainId, range]`, `['notifications', userId]`. Invalidate on mutation. `staleTime` 30–60s for lists.
- **Routing** added *above* the catch-all in `App.tsx` (existing convention). All `/app/*` and `/login`, `/auth/callback` are lazy-loaded like current pages.

### 2.4 Versioning

New tables carry no analysis/scoring versions (they reference reports which already carry them). A single `M5_SCHEMA_VERSION` comment marker per migration. Client feature flag `VITE_ACCOUNTS_ENABLED` (default off until DoD gates pass) lets the accounts UI ship dark and be enabled without a redeploy risk to public flows.

---

## 3. Database schema

All migrations are additive and idempotent (`create table if not exists`, `add column if not exists`, `create policy` guarded by `drop policy if exists`). Filenames follow the existing timestamp convention `supabase/migrations/2026MMDDHHMMSS_<name>.sql`.

### 3.1 New enum

```sql
-- 20260713010000_m5_enums.sql
do $$ begin
  create type public.domain_verification_method as enum ('dns_txt', 'meta_tag', 'file');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum
    ('analysis_complete', 'score_changed', 'pdf_ready', 'domain_verified', 'weekly_digest');
exception when duplicate_object then null; end $$;
```

### 3.2 `profiles` — one row per auth user

```sql
-- 20260713020000_profiles.sql
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,                         -- denormalized from auth for display/search
  full_name     text,
  company_name  text,
  company_org_number text,                    -- Swedish org.nr (optional)
  locale        text not null default 'sv' check (locale in ('sv','en')),
  avatar_url    text,
  marketing_opt_in boolean not null default false,
  onboarded_at  timestamptz,                  -- null until first-run wizard done
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz                   -- GDPR soft-delete grace marker
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();  -- reuse M1 fn

-- Auto-provision a profile whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.3 `user_settings` — preferences split out from profile

```sql
-- 20260713030000_user_settings.sql
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_analysis_complete boolean not null default true,
  notify_score_changed     boolean not null default true,
  notify_pdf_ready         boolean not null default true,
  notify_weekly_digest     boolean not null default false,
  score_change_threshold   integer not null default 3
                            check (score_change_threshold between 1 and 50),
  theme_pref text not null default 'system' check (theme_pref in ('system','dark','light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at_column();
```

Provisioned lazily (upsert on first settings read) or in `handle_new_user` (preferred — one insert with defaults). Add to `handle_new_user` body: `insert into public.user_settings(user_id) values (new.id) on conflict do nothing;`.

### 3.4 `domains` — a monitored website owned by a user

```sql
-- 20260713040000_domains.sql
create table if not exists public.domains (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  normalized_domain text not null,            -- canonicalDomain() output, the join key
  display_name      text,                     -- user-facing label, defaults to domain
  is_primary        boolean not null default false,
  is_favorite       boolean not null default false,
  is_archived       boolean not null default false,
  verified          boolean not null default false,
  verification_method public.domain_verification_method,
  verification_token text,                    -- random, minted on add; checked by verify-domain
  verified_at       timestamptz,
  monitoring_enabled boolean not null default false,  -- scheduled rescan; requires verified
  last_analyzed_at  timestamptz,
  latest_report_id  uuid references public.reports(id) on delete set null,
  latest_score      integer,                  -- denormalized for fast dashboard render
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, normalized_domain)         -- a user can't add the same domain twice
);

create index if not exists domains_user_idx          on public.domains (user_id);
create index if not exists domains_user_active_idx    on public.domains (user_id) where is_archived = false;
create index if not exists domains_normalized_idx     on public.domains (normalized_domain);
-- At most one primary per user (partial unique index).
create unique index if not exists domains_one_primary_per_user
  on public.domains (user_id) where is_primary = true;
-- Monitoring queue lookup for the cron.
create index if not exists domains_monitoring_idx
  on public.domains (monitoring_enabled, last_analyzed_at) where monitoring_enabled = true;

create trigger domains_set_updated_at
  before update on public.domains
  for each row execute function public.update_updated_at_column();
```

> `latest_report_id`/`latest_score`/`last_analyzed_at` are a denormalized fast-path maintained by `save-report`/`rescan-domain` (service role). Dashboards read them without a join. They are advisory; the authoritative history is always `reports`.

### 3.5 `reports` — additive ownership columns (frozen table, additive only)

```sql
-- 20260713050000_reports_ownership.sql
alter table public.reports add column if not exists user_id   uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists domain_id uuid references public.domains(id) on delete set null;
alter table public.reports add column if not exists title     text;   -- optional user label

create index if not exists reports_user_idx           on public.reports (user_id);
create index if not exists reports_domain_measured_idx on public.reports (domain_id, measured_at desc);
```

`on delete set null` (not cascade): deleting an account or a domain must **not** silently destroy immutable public report snapshots that may be shared by URL — they simply become anonymous again (matching their pre-M5 state). Hard deletion of a user's reports is handled explicitly by the GDPR delete flow (§14).

### 3.6 `notifications`

```sql
-- 20260713060000_notifications.sql
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,   -- {report_id, domain_id, delta, pdf_path}
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
```

### 3.7 `audit_log` — security/GDPR event trail (append-only)

```sql
-- 20260713070000_audit_log.sql
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,     -- 'domain_added','domain_verified','account_export','account_delete_requested',...
  target     text,              -- domain / report id / etc.
  ip_hash    text,              -- sha256(ip + daily salt); never store raw IP
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_idx on public.audit_log (user_id, created_at desc);
```

Written only by service role. Users never read it (support/compliance only, via service role).

### 3.8 `rate_limits` — per-user/per-action counters

```sql
-- 20260713080000_rate_limits.sql
create table if not exists public.rate_limits (
  id         bigint generated always as identity primary key,
  subject    text not null,     -- 'user:<uuid>' or 'ip:<hash>'
  action     text not null,     -- 'analyze','rescan','verify','export'
  window_start timestamptz not null,
  count      integer not null default 0,
  unique (subject, action, window_start)
);
create index if not exists rate_limits_lookup_idx on public.rate_limits (subject, action, window_start);
```

Incremented by Edge Functions (service role) via an atomic upsert (`insert ... on conflict (subject,action,window_start) do update set count = rate_limits.count + 1`). Old windows swept by the daily cron.

### 3.9 Relationships summary

```
auth.users 1───1 profiles
auth.users 1───1 user_settings
auth.users 1───* domains ──(latest_report_id)──> reports
auth.users 1───* reports        (nullable user_id; null = anonymous/public)
domains    1───* reports        (nullable domain_id)
auth.users 1───* notifications
auth.users 1───* audit_log      (nullable on delete)
reports    (unchanged public-token identity from M2)
```

### 3.10 Migration strategy

1. Apply in filename order via `supabase db push`. Order matters: enums → profiles (+trigger) → user_settings → domains → reports_ownership (references domains) → notifications → audit_log → rate_limits → policies (§5 shipped as `20260713090000_m5_rls.sql`) → storage (`...100000`) → cron (`...110000`).
2. All statements idempotent → re-runnable, safe on partial failure.
3. **Backfill:** none required. Existing anonymous reports keep `user_id = null`. No data migration touches M1–M4 rows.
4. Regenerate `src/integrations/supabase/types.ts` (`supabase gen types typescript`) after push — additive type changes only.

### 3.11 Rollback strategy

Each migration ships with a documented inverse in a `-- ROLLBACK:` comment block (not auto-run). Because everything is additive:

- Dropping M5 tables (`domains`, `notifications`, `user_settings`, `audit_log`, `rate_limits`, `profiles`) and the three `reports` columns + M5 policies fully reverts to M4 state.
- Rollback order is reverse of apply (drop policies → drop FKs/columns on reports → drop child tables → drop profiles + triggers → drop enums).
- The `handle_new_user` trigger must be dropped first in any rollback so new signups don't error against a missing `profiles`.
- **Data-loss note:** rolling back deletes account data but leaves every public report intact (they revert to anonymous). This is the intended safety property.
- Feature-flag rollback (instant, no DB change): set `VITE_ACCOUNTS_ENABLED=false` and redeploy the SPA → accounts UI disappears, public flows unaffected, DB untouched.

---

## 4. Authentication

### 4.1 Providers

| Method | Mechanism | Notes |
| --- | --- | --- |
| **Magic link** | `supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: <origin>/auth/callback, shouldCreateUser:true }})` | Passwordless. Account is created on first successful link click. |
| **Google** | `supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:<origin>/auth/callback }})` | Requires Google OAuth client (Supabase dashboard → Auth → Providers → Google). |

Both converge on the same `auth.users` row keyed by email (Supabase links Google to an existing email if identity linking is enabled — keep default: separate identities unless verified). `handle_new_user` provisions `profiles` + `user_settings` regardless of provider.

### 4.2 Supabase Auth configuration (dashboard / config, not code)

- **Site URL:** `https://webscore.se`. **Additional redirect URLs:** `https://webscore.se/auth/callback`, `http://localhost:5173/auth/callback` (dev), plus the Cloudflare preview domain.
- **Email OTP:** enabled; expiry 3600s; custom branded email template (Swedish, calibration-ring header) matching M4 PDF aesthetic.
- **Google provider:** client id/secret set; authorized redirect `https://<project-ref>.supabase.co/auth/v1/callback`.
- **JWT expiry:** default 3600s; refresh rotation on (already handled by `autoRefreshToken`).
- **Rate limiting:** GoTrue built-in email send throttling on; augmented by our per-IP `rate_limits` on the request side.

### 4.3 Session handling

- Client already persists to `localStorage` with auto-refresh (`client.ts`, unchanged).
- `AuthProvider` calls `getSession()` on mount and subscribes to `onAuthStateChange` → updates `{ user, session }`. Exposes `loading` until first resolution to avoid login-form flash (mirrors the pattern already used in `Admin.tsx`).
- Edge Functions read the caller identity from the `Authorization: Bearer <jwt>` header: create a **user-scoped** client with the anon key + the JWT to call `auth.getUser()` and obtain a *verified* `user.id`. The service-role client is used only for privileged writes after identity is verified. **Never** trust a `user_id` in the request body.

### 4.4 Account creation

Implicit — first magic-link click or first Google grant creates `auth.users` → trigger creates `profiles`+`user_settings`. A first-run wizard (`onboarded_at is null`) prompts for name/company/locale and offers to **claim** the anonymous report the visitor just ran (via `?claim=<reportId>` carried through login, see §4.8).

### 4.5 Logout

`AuthProvider.signOut()` → `supabase.auth.signOut()` → clears session, react-query cache reset (`queryClient.clear()`), redirect `/`. Applies to `/app/*` only; the internal `/admin` gate is independent.

### 4.6 Recovery

Passwordless ⇒ no password to reset. "Recovery" = request a fresh magic link (same `signInWithOtp`). Lost-access edge cases (email no longer accessible) are out of scope for self-service and handled by support via the service role. Google users recover through Google.

### 4.7 Auth routes & guards

| Route | Component | Access |
| --- | --- | --- |
| `/login` | `LoginPage` | public; if already authed → redirect `next` or `/app` |
| `/auth/callback` | `AuthCallback` | handles OTP/OAuth return, exchanges code, then redirect `next`/`/app` |
| `/app/*` | `AppLayout` + children | `ProtectedRoute` (authed only) |

`ProtectedRoute`: `loading` → skeleton; no session → `<Navigate to={'/login?next='+pathname}/>`.

### 4.8 Claiming an anonymous report (bridge from M2 flow)

A logged-out visitor runs an analysis → gets `/analys/:id` (unchanged). A "Spara i mitt konto" CTA appears. If not authed → `/login?claim=<reportId>&next=/app`. After auth, the client calls the **`claim-report`** Edge Function which (service role, JWT-verified): if `reports.user_id is null`, sets `user_id`, upserts a `domains` row for `normalized_domain`, links `domain_id` + `latest_report_id`. Idempotent; refuses to claim an already-owned report belonging to someone else (returns 409). This is the *only* sanctioned way ownership is attached to a previously-anonymous report.

---

## 5. Row-Level Security

Shipped as one migration `20260713090000_m5_rls.sql`. Principle: **default deny; explicit allow per role.** Anonymous (anon), authenticated (authenticated), and service_role (bypasses RLS entirely).

### 5.1 `profiles`

```sql
alter table public.profiles enable row level security;

create policy "own profile read"   on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- No INSERT policy: rows are created by the SECURITY DEFINER trigger only.
-- No DELETE policy: deletion flows through delete-account (service role).
-- anon: no policies → no access.
```

### 5.2 `user_settings`

```sql
alter table public.user_settings enable row level security;
create policy "own settings read"   on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "own settings write"  on public.user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings insert" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);  -- lazy self-provision fallback
```

### 5.3 `domains`

```sql
alter table public.domains enable row level security;
create policy "own domains read"   on public.domains
  for select to authenticated using (auth.uid() = user_id);
create policy "own domains insert" on public.domains
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own domains update" on public.domains
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own domains delete" on public.domains
  for delete to authenticated using (auth.uid() = user_id);
-- anon: none. A user can ONLY ever see/mutate rows where user_id = their uid.
```

> **Verification & monitoring guard:** RLS lets a user set `verified`/`monitoring_enabled` on their own row, but the *effect* is meaningless without a real verification: `verify-domain` (service role) is the only thing that sets `verified_at` + `verification_method` after a real DNS/meta/file check, and the rescan cron only queues domains that were verified server-side. A user flipping `verified=true` in the DB via the client only lies to their own dashboard; it grants no cross-tenant access and does not enable server-side monitoring (the cron re-checks `verified_at is not null` provenance). To remove even that cosmetic possibility, `verified`, `verified_at`, `verification_method`, `monitoring_enabled` are excluded from the client-updatable column set by a `BEFORE UPDATE` trigger that reverts changes to those columns unless made by service_role (see §5.8).

### 5.4 `reports` — additive owner policy (M2 policy preserved)

```sql
-- The M2 public-token policy is UNCHANGED and remains in force:
--   "public can read public reports"  USING (is_public and not expired)  [anon, authenticated]
-- Add an ADDITIONAL policy so owners can read their OWN reports even if is_public=false:
create policy "owners read own reports" on public.reports
  for select to authenticated using (user_id is not null and auth.uid() = user_id);
-- Still NO client insert/update/delete: writes remain service-role only (save-report, claim-report).
```

Because Postgres RLS combines multiple `permissive` SELECT policies with OR, an authenticated user sees a report if (it's public&unexpired) **or** (they own it). Anonymous users are unaffected — they only match the public policy. No M2 behavior changes.

### 5.5 `notifications`

```sql
alter table public.notifications enable row level security;
create policy "own notifications read"   on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications           -- mark-as-read only
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Insert = service role only (no policy). Delete = service role (retention sweep).
```

A `BEFORE UPDATE` trigger restricts authenticated updates to the `read_at` column (§5.8) so a user can't rewrite notification content.

### 5.6 `audit_log`, `rate_limits`

```sql
alter table public.audit_log  enable row level security;   -- no policies → service role only
alter table public.rate_limits enable row level security;  -- no policies → service role only
```

### 5.7 Anonymous & service-role summary

- **anon:** may read public non-expired reports (M2, unchanged); read public content; call `analyze-website`/`save-report`/`render-pdf` anonymously (unchanged). No access to any M5 table.
- **authenticated:** may read/write only rows scoped to `auth.uid()`; may additionally read own reports; may never read another user's profile, domains, reports, notifications, or settings.
- **service_role:** used exclusively inside Edge Functions for privileged writes after JWT verification. Bypasses RLS by design.

### 5.8 Column-guard triggers (defense in depth)

```sql
-- Prevent authenticated clients from mutating server-owned columns.
create or replace function public.guard_domain_server_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.verified            := old.verified;
    new.verified_at         := old.verified_at;
    new.verification_method := old.verification_method;
    new.monitoring_enabled  := old.monitoring_enabled;
    new.latest_report_id    := old.latest_report_id;
    new.latest_score        := old.latest_score;
    new.last_analyzed_at    := old.last_analyzed_at;
  end if;
  return new;
end $$;
create trigger domains_guard_server_cols
  before update on public.domains
  for each row execute function public.guard_domain_server_columns();

create or replace function public.guard_notification_readonly()
returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.type := old.type; new.title := old.title; new.body := old.body;
    new.data := old.data; new.created_at := old.created_at;
    -- only read_at may change
  end if;
  return new;
end $$;
create trigger notifications_guard_readonly
  before update on public.notifications
  for each row execute function public.guard_notification_readonly();
```

### 5.9 RLS test matrix (must all pass — see §17)

| Actor | Target | Expected |
| --- | --- | --- |
| anon | any M5 table | 0 rows / denied |
| user A | user B profile/domains/reports/notifications/settings | 0 rows |
| user A | own rows | full per policy |
| user A | public report (any) | readable (M2) |
| user A | own private report (is_public=false) | readable (new) |
| anon | private report | not found (M2) |
| user A UPDATE | `domains.verified=true` | reverted by trigger |
| user A UPDATE | `notifications.title` | reverted by trigger |
| user A INSERT | `reports` / `notifications` | denied |

---

## 6. Dashboard

### 6.1 Route & structure

`/app` (index of `AppLayout`). Grid of the user's **active** (non-archived) domains + an aggregate header.

```
AppLayout
├─ Sidebar (Dashboard·Domains·History·Settings) + account menu + logout
├─ TopBar (global Search, NotificationsBell, avatar)
└─ DashboardPage
   ├─ DashboardHeader        (greeting, primary domain highlight, "Analysera ny domän" CTA)
   ├─ SummaryStatRow         (4 KPI tiles: domains tracked · avg score · best trend · needs attention)
   ├─ DomainCardGrid         (one DomainCard per active domain)
   │    └─ DomainCard        (favicon, display_name, latest score gauge, trend sparkline, delta arrow, last analyzed, ★/archive quick actions)
   └─ RecentActivityFeed     (latest N reports/notifications across all domains)
```

### 6.2 Components

- **`SummaryStatRow`** — reuse `CategoryScoreCard`/`ScoreBlock` visual vocabulary; recharts not needed (numbers + delta).
- **`DomainCard`** — reuse `ScoreGauge` + a compact recharts `<LineChart>` sparkline (last ~8 measurements from `reports`). Delta arrow color via existing `score-color.ts`.
- **`RecentActivityFeed`** — timeline items linking to `/analys/:id` (existing report view) or domain detail.

### 6.3 States

- **Empty (no domains):** hero empty-state — calibration-ring illustration, "Analysera din första domän" → inline domain input reusing the landing analyze flow; on completion, prompt to save/claim.
- **Loading:** skeletons (existing `ui/skeleton.tsx`) for stat row + card grid; never spinners for content (spinner only for auth resolution).
- **Error:** `DashboardError` — "Kunde inte hämta din översikt" + retry (react-query `refetch`). Distinguishes network vs. auth-expired (→ re-login).
- **Partial:** a domain whose latest report is `partial` shows a subtle "Delvis analys" chip (reuse M2 partial semantics).

### 6.4 Data

`domain-service.listDomains(userId)` → `select * from domains where user_id=$ and not is_archived order by is_primary desc, is_favorite desc, updated_at desc`. Sparkline via `trend-service.getSparkline(domainId)` (last 8 `reports` rows). Dashboard reads denormalized `latest_score`/`last_analyzed_at` from `domains` for instant paint, then hydrates sparkline lazily.

---

## 7. Domain Management

### 7.1 Route

`/app/domains` (list + management) and `/app/domains/:id` (detail, §10).

### 7.2 Operations

| Action | Mechanism | Notes |
| --- | --- | --- |
| **Add** | client INSERT into `domains` (RLS `user_id=uid`) after `canonicalDomain()` normalize + zod validate; unique(user_id,normalized_domain) prevents dupes → friendly "Domänen finns redan". | Optionally kick an immediate analysis. |
| **Remove** | client DELETE (RLS). Reports keep `domain_id` set null (snapshots survive). Confirm dialog (`ui/alert-dialog`). | |
| **Archive / Unarchive** | client UPDATE `is_archived`. Archived domains hidden from dashboard, still in History, excluded from monitoring. | |
| **Favorite** | client UPDATE `is_favorite`. Sorts to top. | |
| **Primary** | client UPDATE `is_primary=true`; partial unique index enforces one — set others false in a small transaction (RPC `set_primary_domain(domain_id)` `SECURITY INVOKER`, runs under caller RLS). | |
| **Verify ownership** | `verify-domain` Edge Function (§15.4). | Enables monitoring. |
| **Enable monitoring** | UI toggle → calls `verify-domain` result gate; `monitoring_enabled` set by service role only. | Requires verified. |

### 7.3 `set_primary_domain` RPC

```sql
create or replace function public.set_primary_domain(p_domain_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.domains set is_primary = false
    where user_id = auth.uid() and is_primary = true and id <> p_domain_id;
  update public.domains set is_primary = true
    where id = p_domain_id and user_id = auth.uid();
end $$;
```

RLS still applies (`security invoker`) → a user can only reprimary their own domains.

### 7.4 Multiple domains & limits

Free tier cap = **25 active domains/user** (enforced in `add` path: count check before insert; also a DB `check`-style guard via a `before insert` trigger counting the user's rows). Archived domains don't count. Cap is a named constant `MAX_DOMAINS_PER_USER` surfaced in one place.

### 7.5 States

Empty (no domains → same empty-state as dashboard), loading (skeleton rows), error (retry), per-row action pending (optimistic update + rollback on failure via react-query `onError`).

---

## 8. History

### 8.1 Concept

A user's history is the immutable stream of `reports` they own, grouped by domain. Every analysis is a report row; every PDF is `reports.pdf_path`; every AI insight is `reports.report_data.aiInsight` (+ append-only `ai_reports` audit rows). **No new table** — history is a query.

### 8.2 Routes

- `/app/history` — global, reverse-chronological across all owned domains, filterable by domain/date/status.
- `/app/domains/:id` → **History** tab — per-domain timeline (§10).

### 8.3 Timeline item

Each report row renders: date (`measured_at`), score + delta vs previous, status chip (complete/partial), AI-insight presence badge, PDF availability (download → existing `requestReportPdf` / `render-pdf`), and a link to the frozen `/analys/:id` view. Version history is explicit: `analysis_version`/`scoring_version` shown on hover so users understand why two scores differ across engine versions (reuse M1/M2 versioning fields).

### 8.4 Data & pagination

`history-service.listReports({ domainId?, userId, cursor, filters })` → keyset pagination on `(measured_at desc, id desc)` using `reports_domain_measured_idx` / `reports_user_idx`. Page size 20. Filters: domain, status, date range, has-PDF, has-AI. Returns `{ items, nextCursor }`.

### 8.5 States

Empty ("Inga analyser ännu" + CTA), loading (skeleton timeline), error (retry), end-of-list ("Inga fler analyser").

---

## 9. Trend Analytics

### 9.1 Metrics

From `reports.category_scores` (frozen shape: `seo, conversion, trust, performance, security`) + `final_score`. UX in the product vocabulary maps to **conversion** (the existing UX/conversion category). Displayed series: **Overall, Performance, SEO, UX (conversion), Trust, Security.** (Spec's "Conversion" and "UX" both derive from the single `conversion` category — labeled per the product's existing copy; no engine change.)

### 9.2 Charts

- **Overall trend**: recharts `<LineChart>` of `final_score` over `measured_at`.
- **Per-category small multiples**: 5 mini line charts sharing an x-axis, colored via `score-color.ts` bands.
- **Latest breakdown**: reuse `CategoryScoreCard` for current values with delta vs. range start.
- Follow the `dataviz` skill palette/accessibility rules; theme-aware (dark default, existing tokens).

### 9.3 Time ranges

`30d · 90d · 6m · 12m · All`. Range filters the `reports` query server-side by `measured_at`. If <2 points in range → "Behöver minst två analyser för en trend" empty state (no misleading single-point line).

### 9.4 Data

`trend-service.getTrend(domainId, range)` → `select measured_at, final_score, category_scores from reports where domain_id=$ and measured_at >= now()-range order by measured_at asc` (uses `reports_domain_measured_idx`). Downsample client-side if >200 points (LTTB) — unlikely at current cadence. Cached by react-query key `['trend', domainId, range]`.

### 9.5 Accrual

Trend points accrue from (a) manual re-analyses the user triggers, and (b) scheduled monitoring rescans (§15.6) for verified domains. Each produces a new `reports` row via the frozen save path.

---

## 10. Domain Details

### 10.1 Route

`/app/domains/:id`, tabbed. Guard: RLS ensures a user can only load their own domain (row invisible otherwise → 404 state).

### 10.2 Layout

```
DomainDetailPage
├─ DomainHeader     (favicon, display_name, domain, primary/favorite toggles, verified badge, "Analysera nu" CTA, archive)
├─ Tabs
│   ├─ Overview     (latest ScoreGauge + CategoryScoreCards + latest AI biggest-problem summary from report_data)
│   ├─ Trends       (§9 charts + range selector)
│   ├─ History      (§8 per-domain timeline, paginated)
│   ├─ Reports/PDFs (list of PDFs; download via render-pdf/signed URL)
│   └─ Settings     (display_name, verification, monitoring toggle, remove)
└─ VerificationPanel (shown until verified: chosen method + token + "Verifiera" → verify-domain)
```

### 10.3 Data

Composed from `domains` row + latest `reports` (`latest_report_id`) + trend query + history query. All reads RLS-scoped. "Analysera nu" reuses the existing `analyze-website` → `save-report` pipeline, now passing the JWT so the new report is owned + linked to this `domain_id`.

### 10.4 States

Not-found (unowned/deleted id → friendly 404 within app shell), unverified (verification panel prominent, monitoring disabled), loading (skeleton tabs), error (retry). Partial latest report → partial chip + explanation.

---

## 11. Search

### 11.1 Scope

Global search (top bar, `ui/command.tsx` palette) over the user's **own** domains and reports. Two indexes:

- **Domains:** client-side filter over the already-loaded domain list (small N ≤ 25) — instant, no query. Match `display_name` + `normalized_domain`.
- **Reports/History:** server query `select ... from reports where user_id=auth.uid() and normalized_domain ilike '%q%' order by measured_at desc limit 20` (RLS-scoped). Debounced 250ms.

### 11.2 Filters

History page filters (§8.4): domain (select), status (complete/partial), date range (`react-day-picker`, present), has-PDF, has-AI-insight. Combined into the keyset query as `where` clauses. Domain search uses a trigram index for scale:

```sql
create extension if not exists pg_trgm;
create index if not exists reports_domain_trgm_idx on public.reports using gin (normalized_domain gin_trgm_ops);
```

### 11.3 States

No-query (recent domains + recent reports), no-results ("Inget hittades"), loading (inline), error (silent fallback to client-only domain matches).

---

## 12. Notifications

### 12.1 Triggers (all created server-side, service role)

| Event | Fired by | Payload |
| --- | --- | --- |
| **analysis_complete** | `save-report` when a report is owned (`user_id` set) | `{report_id, domain_id, score}` |
| **score_changed** | `save-report`/`rescan-domain` when `|new − prev| ≥ user.score_change_threshold` | `{report_id, domain_id, delta, prev, next}` |
| **pdf_ready** | `render-pdf` after a PDF is generated for an owned report | `{report_id, pdf_path}` |
| **domain_verified** | `verify-domain` on success | `{domain_id}` |
| **weekly_digest** | cron (opt-in) | aggregate |

Each insert respects the user's `user_settings` flags (skip if disabled).

### 12.2 Delivery

- **In-app:** `NotificationsBell` (top bar) — unread count from `notifications_user_unread_idx`; dropdown list; click → mark `read_at` (client UPDATE, guarded to `read_at` only); "Markera alla som lästa" (bulk update own rows). Realtime optional via Supabase Realtime subscription on `notifications` filtered by `user_id` (RLS-safe).
- **Email (optional, phase 2 within M5):** a `notify-email` function invoked by the same triggers for high-value events (score_changed, weekly_digest) using the existing email path used by lead/report emails. Respect opt-in.

### 12.3 States

Empty ("Inga aviseringar"), unread badge, loading (skeleton rows), error (bell shows last good count, silent retry).

### 12.4 Retention

Notifications older than 180 days pruned by the daily cron (service role delete).

---

## 13. Settings

### 13.1 Route

`/app/settings` with sub-sections (tabs or nested routes):

| Section | Fields | Storage |
| --- | --- | --- |
| **Profile** | full_name, avatar (upload → `avatars` bucket), email (read-only, change via re-auth) | `profiles` |
| **Company** | company_name, company_org_number | `profiles` |
| **Language** | locale (sv/en), theme_pref | `profiles.locale`, `user_settings.theme_pref` |
| **Notifications** | per-type toggles, score_change_threshold, weekly_digest | `user_settings` |
| **Account** | connected providers (Google/email), sign-out-everywhere, delete account | Auth + `delete-account` |
| **Privacy / GDPR** | export data, delete account, marketing_opt_in | §14 |

### 13.2 Avatars bucket (optional)

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars','avatars', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
-- Per-user folder policy: object path = '<uid>/...'; user may read/write only their own folder.
create policy "avatars read own"  on storage.objects for select to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars write own" on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

`avatar_url` stores a signed or path reference; UI mints short-lived signed URLs.

### 13.3 Forms

react-hook-form + zod, optimistic save with toast (`sonner`, present). All writes are client UPDATEs under RLS (`profiles`/`user_settings`).

### 13.4 States

Loading (skeleton form), saving (button pending), success (toast), error (field-level + toast), unsaved-changes guard on navigation.

---

## 14. GDPR

### 14.1 Export data

`export-account-data` Edge Function (JWT-verified, service role read). Gathers: profile, user_settings, domains, all owned reports (metadata + report_data), notifications, audit_log entries for the user → single JSON. Streams as a download (`Content-Disposition: attachment; account-export-<date>.json`). Logs an `account_export` audit row. Rate-limited (1/hour/user).

### 14.2 Delete account

`delete-account` Edge Function (JWT-verified). Flow:

1. Verify caller `user.id` from JWT (never from body).
2. Write `audit_log` `account_delete_requested`.
3. **Reports:** either (a) hard-delete owned reports, or (b) anonymize (`user_id=null, domain_id=null, is_public=<keep>`), per the user's choice in the confirm dialog ("Ta bort mina rapporter" vs "Behåll delade rapporter anonymt"). Default = anonymize public, delete private.
4. Delete `domains`, `notifications`, `user_settings`, `profiles` (FK cascades from `auth.users` handle most, but do it explicitly for control + to run the reports policy above first).
5. `supabase.auth.admin.deleteUser(user.id)` → removes the auth identity (cascades remaining).
6. Return success → client `signOut()` + redirect `/` with confirmation.

Irreversible; double-confirm with typed domain/email match (`ui/alert-dialog`). Soft-delete grace: set `profiles.deleted_at` and schedule hard delete after 30 days via cron (optional; default is immediate hard delete with explicit consent).

### 14.3 Data minimization

- IPs never stored raw — only `sha256(ip + daily_salt)` in `audit_log`/`rate_limits`.
- Page text never leaves backend (already true from M3) — accounts don't change this.
- Marketing email only if `marketing_opt_in`.

---

## 15. Security

### 15.1 Threat model

| Threat | Vector | Mitigation |
| --- | --- | --- |
| Cross-tenant data read | user A queries user B's rows | RLS `user_id=auth.uid()` on every M5 table; §17 test matrix; anon has no policies. |
| Forged ownership | client sends `user_id` in body to `save-report`/`claim-report` | Ownership taken from verified JWT only; body `user_id` ignored. |
| Privilege escalation via server columns | client sets `verified`/`monitoring_enabled`/`latest_score` | Column-guard triggers revert non-service_role writes (§5.8). |
| Scan amplification / competitor surveillance | user adds someone else's domain, enables monitoring → free repeated scans of a third party | Monitoring requires **server-verified** ownership (DNS/meta/file); rate limits on analyze/rescan; unverified domains limited to on-demand, user-initiated, rate-limited scans (same exposure as anonymous today). |
| Report token guessing | enumerate `/analys/:id` | UUIDv4 tokens (M2, unchanged); owner policy adds no enumeration surface. |
| Notification/content tampering | user rewrites notification or report | No client write policies on `reports`/`notifications` content; read-only guard trigger. |
| Magic-link interception / open redirect | crafted `next`/redirect | Whitelist redirect URLs in Supabase; validate `next` is a same-origin path (starts with `/app` or `/`); reject absolute URLs. |
| Account takeover via email change | changing email to victim's | Email changes require re-auth + confirmation link to both addresses (GoTrue default). |
| Abuse of export/delete | hammering GDPR endpoints | Rate-limit 1/hour; audit log. |
| CSRF on Edge Functions | — | Functions are token-authenticated (Bearer JWT), not cookie-authenticated → not CSRF-exploitable; CORS mirrors existing functions. |

### 15.2 Abuse protection

- Per-user `MAX_DOMAINS_PER_USER=25`; per-IP signup throttle (GoTrue + `rate_limits`).
- Analyze/rescan: per-user and per-domain cooldown (reuse `analysis_cache.last_forced_at` for forced refresh throttling, already present).

### 15.3 Rate limits (concrete)

| Action | Limit | Scope |
| --- | --- | --- |
| magic-link send | 3 / 15 min | per email + per IP (GoTrue) |
| analyze (authed) | 20 / hour | per user |
| rescan (manual) | 6 / hour | per domain |
| verify-domain | 10 / hour | per user |
| export-account | 1 / hour | per user |
| delete-account | 3 / day | per user |

Enforced via `rate_limits` atomic upsert at function entry; over-limit → 429 with `Retry-After`.

### 15.4 Ownership verification (`verify-domain`)

Three methods (user picks one; token = `webscore-verify=<random-32>`):

1. **DNS TXT** — user adds `TXT _webscore.<domain> = <token>`; function does DNS-over-HTTPS lookup (Cloudflare/Google DoH) and matches.
2. **Meta tag** — `<meta name="webscore-verify" content="<token>">` on the homepage; function fetches homepage (reusing the crawl fetch path) and checks.
3. **File** — `/.well-known/webscore-verify.txt` containing the token; function fetches and matches.

On match (service role): set `verified=true, verified_at=now(), verification_method`, insert `domain_verified` notification, audit row. Verification is re-checked before enabling monitoring and periodically by the cron (revoke `monitoring_enabled` if it disappears — prevents stale monitoring of a domain the user no longer controls).

### 15.5 Secrets & config

New function secrets: none beyond existing (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, PDF render secrets from M4). Google OAuth secret lives in Supabase Auth config, not in code. DoH endpoint is a public URL.

### 15.6 Scheduled monitoring (cron)

`pg_cron` job (or Supabase scheduled Edge Function) hourly: select verified, monitoring-enabled domains whose `last_analyzed_at` is older than the cadence (e.g. 7 days) → invoke `rescan-domain` per domain (service role) → runs the frozen analyze→save pipeline with the domain's `user_id`, producing a new owned report, updating denormalized fields, and emitting score-change notifications. Batched + rate-limited. Off by default per domain.

---

## 16. Performance

- **Caching:** analysis reuses `analysis_cache` (unchanged). Dashboard/domain reads use denormalized `latest_score`/`last_analyzed_at` to avoid joins. react-query `staleTime` 30–60s + background refetch. Trend queries cached per range.
- **Pagination:** keyset (not offset) on history/search via `(measured_at desc, id desc)`; page 20.
- **Indexes:** every list/filter path is index-backed (§3 indexes: `domains_user_active_idx`, `reports_domain_measured_idx`, `reports_user_idx`, `notifications_user_unread_idx`, trigram for search).
- **Lazy loading:** all `/app/*` routes lazy-loaded (existing pattern); charts (recharts) code-split; sparklines rendered only when a card enters viewport (IntersectionObserver) to keep the dashboard grid light.
- **Payload discipline:** history/list queries select only needed columns (never `report_data` in lists — only on detail). Trend selects `final_score, category_scores, measured_at` only.
- **Denormalization maintenance:** `save-report`/`rescan-domain` update `domains.latest_*` in the same transaction as the report insert to keep dashboard reads O(1).

---

## 17. Testing

### 17.1 Unit (vitest, existing harness)

- `domain.ts` canonicalization parity with Edge `canonicalDomain` (shared expectation table).
- Trend/history service pure transforms (delta computation, downsampling, range filtering).
- Notification threshold logic (respect `score_change_threshold`, settings flags).
- zod schemas for add-domain, settings forms.
- Redirect-`next` validator (rejects absolute URLs / open redirects).

### 17.2 Integration

- `handle_new_user` trigger creates profile + settings on signup (against a local Supabase).
- `save-report` ownership path: with JWT → report owned + domain linked + denormalized fields + notification; without JWT → anonymous (M2 behavior byte-for-byte unchanged — regression guard).
- `claim-report`: null→owned; already-owned-by-other → 409; idempotent re-claim.
- `verify-domain`: each method success/failure; sets server columns; emits notification.
- `delete-account`: reports anonymized/deleted per choice; auth user removed; cascade complete.
- `export-account-data`: JSON completeness + no other user's data leaks.

### 17.3 Browser (Playwright, present as devDependency)

- Magic-link + Google sign-in (mocked provider) → land on `/app`.
- Empty state → add domain → analyze → report appears in history + dashboard.
- Trend chart renders with ≥2 points; single-point shows guidance.
- Notifications bell increments on score change; mark-as-read persists.
- Settings save round-trips; language toggle switches copy.
- Logout clears session and blocks `/app/*`.

### 17.4 Security tests (must pass — gate)

- **Cross-tenant matrix** (§5.9) executed as two real users via the anon key + JWT — every "0 rows" assertion enforced.
- Column-guard triggers: attempts to set `verified`/notification content revert.
- Direct client INSERT into `reports`/`notifications` rejected.
- Anonymous access to any M5 table denied.
- Open-redirect and forged-`user_id` attempts fail.
- Rate-limit endpoints return 429 past threshold.

### 17.5 CI gates

`npm run lint`, `tsc --noEmit`, `npm test`, `npm run build` all green; Playwright suite green; RLS matrix green. No new `any` on data boundaries.

---

## 18. Deployment

### 18.1 Order

1. **DB migrations** (`supabase db push`) in filename order (§3.10): enums → profiles(+trigger) → user_settings → domains → reports_ownership → notifications → audit_log → rate_limits → RLS → storage(avatars) → cron. Idempotent; safe to re-run.
2. **Regenerate types** → commit `src/integrations/supabase/types.ts`.
3. **Edge Functions** (`supabase functions deploy`): `claim-report`, `verify-domain`, `export-account-data`, `delete-account`, `rescan-domain`, optional `notify-email`; **redeploy** `save-report` with the additive ownership path.
4. **Auth config** (dashboard): redirect URLs, Google provider, email templates.
5. **Frontend** (Cloudflare Pages) with `VITE_ACCOUNTS_ENABLED=false` initially → accounts UI dark. Public flows verified unaffected.
6. **Flip flag** `VITE_ACCOUNTS_ENABLED=true` + redeploy once verification passes.
7. **Enable cron** last (after monitoring path verified end-to-end).

### 18.2 Verification (post-deploy, live)

- M1–M4 smoke: anonymous analyze → `/analys/:id` → PDF still work byte-for-byte (regression guard on the public path).
- New: sign up (both providers), add+verify a domain, analyze, see it in dashboard/history/trends, receive a notification, change settings, export data, delete a throwaway account.
- RLS live check with two accounts (cross-tenant reads return nothing).
- Cloudflare bundle actually propagated (known M3/M4 lag — check build log, retrigger if stale; note sandbox `.se` DNS SERVFAIL → use `--resolve webscore.se:443:104.21.84.70`).

### 18.3 Rollback

- **Fast:** `VITE_ACCOUNTS_ENABLED=false` + redeploy → accounts UI gone, DB intact, zero public-flow risk.
- **Function:** redeploy previous `save-report`; new functions are inert if unused.
- **DB:** run documented inverse migrations in reverse order (§3.11). Public reports survive (revert to anonymous). Drop `handle_new_user` trigger first.

---

## 19. Definition of Done

Measurable production gates — all must be green.

**Compatibility**
1. Anonymous analyze → `/analys/:id` → PDF path is byte-for-byte unchanged (automated regression test + live smoke). No M1–M4 migration/function/route modified (git diff shows only additions, save-report additively extended).

**Auth**
2. Magic-link and Google sign-in both create an account, provision `profiles`+`user_settings`, and land on `/app`. Logout clears session and blocks `/app/*`. Recovery via fresh magic link works.

**Data isolation (hard gate)**
3. Full RLS cross-tenant matrix (§5.9) passes for two real users. Anonymous has zero access to any M5 table. Column-guard triggers revert server-owned writes. Direct client writes to `reports`/`notifications` denied. All executed in CI + verified live.

**Dashboard / Domains / History / Trends**
4. A new user can add a domain, analyze it, and see it on the dashboard with score + trend, in history (paginated, versioned), and on the domain detail page with per-category trend charts across all time ranges. Empty/loading/error/partial states all render.
5. Add / remove / archive / favorite / set-primary all work under RLS; exactly one primary per user enforced by DB; 25-domain cap enforced.

**Verification / Monitoring**
6. Domain verification succeeds via at least DNS-TXT and one other method; only server-verified domains can enable monitoring; scheduled rescan produces new owned reports and score-change notifications; unverified/cosmetic writes grant no server monitoring.

**Notifications / Settings / Search**
7. analysis_complete, score_changed, pdf_ready, domain_verified notifications fire per user settings; unread badge + mark-read persist. Settings (profile/company/language/notifications) round-trip. Global search finds own domains + reports and nothing from other users.

**GDPR**
8. Export returns a complete JSON of only the caller's data. Delete account removes the auth identity + account data, anonymizes/deletes owned reports per the user's explicit choice, and is irreversible after double-confirm.

**Security / Performance**
9. All rate limits return 429 past threshold; IPs stored only hashed; open-redirect and forged-`user_id` attempts fail. Dashboard first paint uses denormalized fields (no N+1); all list/search/trend paths are index-backed; history uses keyset pagination.

**Quality**
10. `lint`, `tsc`, `test`, `build`, Playwright, and the RLS security suite are all green in CI. Types regenerated and committed. Feature flag verified to fully hide accounts when off.

---

## Appendix A — New files (implementation map)

```
Migrations  supabase/migrations/20260713{01..11}0000_*.sql   (enums, profiles, user_settings,
                                                              domains, reports_ownership, notifications,
                                                              audit_log, rate_limits, m5_rls, storage, cron)
Functions   supabase/functions/claim-report/index.ts
            supabase/functions/verify-domain/index.ts
            supabase/functions/export-account-data/index.ts
            supabase/functions/delete-account/index.ts
            supabase/functions/rescan-domain/index.ts
            supabase/functions/save-report/index.ts           (additive edit: JWT ownership path)
            supabase/functions/_shared/canonical-domain.ts     (extract shared normalizer, reused by domains)
Frontend    src/context/AuthContext.tsx
            src/components/auth/ProtectedRoute.tsx
            src/pages/LoginPage.tsx  src/pages/AuthCallback.tsx
            src/app/AppLayout.tsx
            src/app/DashboardPage.tsx  DomainsPage.tsx  DomainDetailPage.tsx
                HistoryPage.tsx  SettingsPage.tsx
            src/components/app/{DomainCard,SummaryStatRow,TrendChart,TimelineItem,
                NotificationsBell,GlobalSearch,VerificationPanel}.tsx
            src/lib/account/{profile,domain,history,trend,notification}-service.ts
            src/lib/account/limits.ts   (MAX_DOMAINS_PER_USER, thresholds)
Routing     src/App.tsx   (add /login, /auth/callback, /app/* above catch-all — additive)
Config      .env          (VITE_ACCOUNTS_ENABLED)
```

## Appendix B — Explicit non-changes (frozen)

`analyze-website`, `measurement.ts`, `ai-insight.ts`, `scoring-engine.ts`, `render-pdf` + `pdf-template.ts`, the M2 `reports` public-read policy, `analysis_cache`, `ai_reports`, `leads`, `/admin`, and the entire public landing/report/PDF flow. M5 adds around them; it does not touch them.
```
