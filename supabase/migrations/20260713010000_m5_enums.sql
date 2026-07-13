-- M5 (accounts platform) — enums. Additive, idempotent.
-- See M5_SPEC.md §3.1. Safe to re-run.

do $$ begin
  create type public.domain_verification_method as enum ('dns_txt', 'meta_tag', 'file');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum
    ('analysis_complete', 'score_changed', 'pdf_ready', 'domain_verified', 'weekly_digest');
exception when duplicate_object then null; end $$;

-- ROLLBACK:
--   drop type if exists public.notification_type;
--   drop type if exists public.domain_verification_method;
