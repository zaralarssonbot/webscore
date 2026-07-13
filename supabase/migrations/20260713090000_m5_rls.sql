-- M5 — Row-Level Security for all account tables. Default deny; explicit allow.
-- See M5_SPEC.md §5. The M2 reports public-read policy is UNCHANGED; this file
-- only ADDS an owner-read policy alongside it (Postgres ORs permissive SELECTs).

-- ── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- No INSERT policy: rows created by the SECURITY DEFINER trigger only.
-- No DELETE policy: deletion flows through delete-account (service role).

-- ── user_settings ───────────────────────────────────────────────────────────
alter table public.user_settings enable row level security;
drop policy if exists "own settings read"   on public.user_settings;
drop policy if exists "own settings write"  on public.user_settings;
drop policy if exists "own settings insert" on public.user_settings;
create policy "own settings read"   on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "own settings write"  on public.user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings insert" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);  -- lazy self-provision fallback

-- ── domains ─────────────────────────────────────────────────────────────────
alter table public.domains enable row level security;
drop policy if exists "own domains read"   on public.domains;
drop policy if exists "own domains insert" on public.domains;
drop policy if exists "own domains update" on public.domains;
drop policy if exists "own domains delete" on public.domains;
create policy "own domains read"   on public.domains
  for select to authenticated using (auth.uid() = user_id);
create policy "own domains insert" on public.domains
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own domains update" on public.domains
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own domains delete" on public.domains
  for delete to authenticated using (auth.uid() = user_id);

-- ── reports (ADDITIVE — M2 public policy preserved) ─────────────────────────
-- The M2 policy "public can read public reports" (is_public and not expired)
-- for anon+authenticated stays exactly as-is. We add owner-read so a user can
-- see their OWN reports even when is_public = false. Writes stay service-role.
drop policy if exists "owners read own reports" on public.reports;
create policy "owners read own reports" on public.reports
  for select to authenticated using (user_id is not null and auth.uid() = user_id);

-- ── notifications ───────────────────────────────────────────────────────────
alter table public.notifications enable row level security;
drop policy if exists "own notifications read"   on public.notifications;
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications read"   on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Insert = service role only (no policy). Delete = service role (retention sweep).

-- ── audit_log, rate_limits — service role only (RLS on, no policies) ────────
alter table public.audit_log  enable row level security;
alter table public.rate_limits enable row level security;

-- ── Column-guard triggers (defense in depth) — §5.8 ─────────────────────────
-- Prevent authenticated clients from mutating server-owned columns even though
-- they legitimately own the row.
create or replace function public.guard_domain_server_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.verified            := old.verified;
    new.verified_at         := old.verified_at;
    new.verification_method := old.verification_method;
    new.verification_token  := old.verification_token;
    new.monitoring_enabled  := old.monitoring_enabled;
    new.latest_report_id    := old.latest_report_id;
    new.latest_score        := old.latest_score;
    new.last_analyzed_at    := old.last_analyzed_at;
  end if;
  return new;
end $$;
drop trigger if exists domains_guard_server_cols on public.domains;
create trigger domains_guard_server_cols
  before update on public.domains
  for each row execute function public.guard_domain_server_columns();

create or replace function public.guard_notification_readonly()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.type := old.type; new.title := old.title; new.body := old.body;
    new.data := old.data; new.created_at := old.created_at; new.user_id := old.user_id;
    -- only read_at may change
  end if;
  return new;
end $$;
drop trigger if exists notifications_guard_readonly on public.notifications;
create trigger notifications_guard_readonly
  before update on public.notifications
  for each row execute function public.guard_notification_readonly();

-- ROLLBACK:
--   drop trigger if exists notifications_guard_readonly on public.notifications;
--   drop trigger if exists domains_guard_server_cols on public.domains;
--   drop function if exists public.guard_notification_readonly();
--   drop function if exists public.guard_domain_server_columns();
--   drop policy if exists "owners read own reports" on public.reports;
--   -- (drop the per-table policies created above; disable RLS as needed)
