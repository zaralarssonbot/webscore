-- M3: versioned, append-only AI insight audit log.
--
-- ai_reports is already insert-only (one row per generation). Add explicit
-- versioning + provenance columns so historical AI output is never silently
-- overwritten when prompts or models change: a new prompt/model simply writes a
-- new row carrying its own versions. All columns are additive and nullable, so
-- existing rows and the existing insert path keep working.

alter table public.ai_reports add column if not exists ai_report_version text;
alter table public.ai_reports add column if not exists prompt_version    text;
alter table public.ai_reports add column if not exists model             text;
alter table public.ai_reports add column if not exists analysis_version  text;
alter table public.ai_reports add column if not exists scoring_version   text;
alter table public.ai_reports add column if not exists report_id         uuid;
alter table public.ai_reports add column if not exists ai_generated      boolean;
alter table public.ai_reports add column if not exists fallback_reason   text;
alter table public.ai_reports add column if not exists validation_errors jsonb default '[]'::jsonb;
-- The full structured insight (sections + evidenceCheckIds + meta).
alter table public.ai_reports add column if not exists insight           jsonb;

create index if not exists ai_reports_report_id_idx on public.ai_reports (report_id);
create index if not exists ai_reports_prompt_version_idx on public.ai_reports (prompt_version);
