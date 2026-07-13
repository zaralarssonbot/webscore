-- M5 — additive ownership columns on the FROZEN M2 reports table.
-- See M5_SPEC.md §3.5. Additive only: the M2 public-token identity, public-read
-- policy, and service-role write path are all UNCHANGED.
--
-- on delete SET NULL (not cascade): deleting an account or a domain must never
-- destroy an immutable public report snapshot that may be shared by URL — the
-- report simply reverts to anonymous (its pre-M5 state). Hard deletion of a
-- user's reports is handled explicitly by the GDPR delete flow (§14).

alter table public.reports add column if not exists user_id   uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists domain_id uuid references public.domains(id) on delete set null;
alter table public.reports add column if not exists title     text;

create index if not exists reports_user_idx            on public.reports (user_id);
create index if not exists reports_domain_measured_idx  on public.reports (domain_id, measured_at desc);

-- ROLLBACK:
--   drop index if exists public.reports_domain_measured_idx;
--   drop index if exists public.reports_user_idx;
--   alter table public.reports drop column if exists title;
--   alter table public.reports drop column if exists domain_id;
--   alter table public.reports drop column if exists user_id;
