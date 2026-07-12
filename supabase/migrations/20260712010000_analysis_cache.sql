-- Server-side per-domain analysis measurement cache.
-- Stores the COMPLETE raw measurement (crawled checks + PageSpeed) keyed by a
-- single canonical domain, so every browser/user analyzing the same site during
-- the TTL receives the identical measurement — and therefore the identical
-- score. Only the service-role edge function reads/writes it (RLS denies all
-- other roles). AI prose is never stored here as the source of truth.

create table if not exists public.analysis_cache (
  domain           text primary key,          -- canonical domain (no scheme/www/path)
  measurement      jsonb       not null,       -- complete measurement payload
  analysis_version text        not null,       -- crawl+checks pipeline version
  scoring_version  text        not null,       -- scoring-rules version
  measured_at      timestamptz not null default now(),
  expires_at       timestamptz not null,       -- measured_at + TTL
  last_forced_at   timestamptz                 -- last forced refresh (rate limiting)
);

create index if not exists analysis_cache_expires_idx
  on public.analysis_cache (expires_at);

-- Locked down: only the service role (the edge function) may touch this table.
alter table public.analysis_cache enable row level security;
-- No policies for anon/authenticated → both are denied; service_role bypasses RLS.
