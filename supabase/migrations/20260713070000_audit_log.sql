-- M5 — audit_log: append-only security/GDPR event trail.
-- Written only by service role; never read by users (RLS: no policies).
-- IPs are stored only as sha256(ip + daily salt), never raw. See M5_SPEC.md §3.7, §14.3.

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,     -- 'domain_added','domain_verified','account_export',...
  target     text,              -- domain / report id / etc.
  ip_hash    text,              -- sha256(ip + daily salt); never the raw IP
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_idx on public.audit_log (user_id, created_at desc);

-- ROLLBACK:
--   drop table if exists public.audit_log;
