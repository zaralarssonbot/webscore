-- M5 — private avatars bucket + trigram search index. See M5_SPEC.md §13.2, §11.2.
-- Additive, idempotent. The report-pdfs bucket (M4) is untouched.

-- Private avatars bucket (2 MB, images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars','avatars', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Per-user folder isolation: object path must be '<uid>/...'.
drop policy if exists "avatars read own"   on storage.objects;
drop policy if exists "avatars write own"  on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars read own"  on storage.objects for select to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars write own" on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Trigram index for domain search over reports (§11.2).
create extension if not exists pg_trgm;
create index if not exists reports_domain_trgm_idx
  on public.reports using gin (normalized_domain gin_trgm_ops);

-- ROLLBACK:
--   drop index if exists public.reports_domain_trgm_idx;
--   drop policy if exists "avatars delete own" on storage.objects;
--   drop policy if exists "avatars update own" on storage.objects;
--   drop policy if exists "avatars write own"  on storage.objects;
--   drop policy if exists "avatars read own"   on storage.objects;
--   delete from storage.buckets where id = 'avatars';
