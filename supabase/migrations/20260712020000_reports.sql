-- M2: persistent, shareable Webscore reports.
--
-- A report is an immutable snapshot of ONE completed analysis. Its `id` is a
-- non-guessable UUID that becomes the public /analys/:id URL. Reports are
-- written ONLY by trusted backend code (the save-report Edge Function, which
-- uses the service role and so bypasses RLS). The public may READ only reports
-- explicitly marked public and not expired — never create or modify them.

create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  normalized_domain text        not null,
  final_score       integer     not null,
  category_scores   jsonb       not null default '{}'::jsonb,
  status            text        not null default 'complete'
                                check (status in ('complete', 'partial')),
  partial_reasons   jsonb       not null default '[]'::jsonb,
  analysis_version  text        not null,
  scoring_version   text        not null,
  -- The full, sanitized, renderable snapshot (checks, category scores, AI prose,
  -- competitors, recommendations, roadmap). NEVER contains internal prompts,
  -- upstream secrets, or raw page text — save-report strips those.
  report_data       jsonb       not null,
  is_public         boolean     not null default true,
  measured_at       timestamptz,
  expires_at        timestamptz,                     -- null = permanent (default)
  created_at        timestamptz not null default now()
);

create index if not exists reports_normalized_domain_idx on public.reports (normalized_domain);
create index if not exists reports_created_at_idx        on public.reports (created_at desc);

alter table public.reports enable row level security;

-- Public read: only public, non-expired reports are visible to anon/authenticated.
-- A deleted or expired report simply returns no row → the UI shows "not found".
drop policy if exists "public can read public reports" on public.reports;
create policy "public can read public reports"
  on public.reports
  for select
  to anon, authenticated
  using (is_public = true and (expires_at is null or expires_at > now()));

-- NOTE: there are deliberately NO insert/update/delete policies. Without them,
-- anon/authenticated cannot write at all; only the service role (which bypasses
-- RLS) — i.e. the save-report Edge Function — can create or modify reports.
