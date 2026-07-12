-- M4: immutable branded PDF artifact per report.
--
-- One PDF per report, stored in a PRIVATE Storage bucket and served only via
-- short-lived signed URLs minted by the render-pdf Edge Function (service role).
-- The bucket has no public policy — objects are never world-readable. Additive
-- only: two nullable columns on reports track the stored artifact.

-- Private bucket for generated report PDFs (10 MB cap, PDF only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-pdfs', 'report-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Track the immutable artifact on the report snapshot.
alter table public.reports add column if not exists pdf_path         text;
alter table public.reports add column if not exists pdf_generated_at timestamptz;

-- NOTE: no storage RLS policies for anon/authenticated are added. The bucket
-- stays private; only the service role (render-pdf) uploads objects and mints
-- signed URLs, which grant time-limited read access without a policy.
