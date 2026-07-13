-- M5 — notifications. Written only by service-role Edge Functions; users read
-- their own and may only flip read_at (guarded in the RLS migration).
-- See M5_SPEC.md §3.6, §12. Additive, idempotent.

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

-- ROLLBACK:
--   drop table if exists public.notifications;
