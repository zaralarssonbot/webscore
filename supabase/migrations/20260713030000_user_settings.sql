-- M5 — user_settings: preferences split out from profile.
-- See M5_SPEC.md §3.3. Additive, idempotent.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_analysis_complete boolean not null default true,
  notify_score_changed     boolean not null default true,
  notify_pdf_ready         boolean not null default true,
  notify_weekly_digest     boolean not null default false,
  score_change_threshold   integer not null default 3
                            check (score_change_threshold between 1 and 50),
  theme_pref text not null default 'system' check (theme_pref in ('system','dark','light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at_column();

-- Redefine the signup handler to ALSO seed default settings. Runs after this
-- table exists so the insert target is guaranteed present. Idempotent.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

-- ROLLBACK:
--   -- restore the profiles-only handle_new_user from 20260713020000, then:
--   drop table if exists public.user_settings;
