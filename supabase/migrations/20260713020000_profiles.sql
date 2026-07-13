-- M5 — profiles: one row per auth user, auto-provisioned on signup.
-- See M5_SPEC.md §3.2. Additive, idempotent.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,                         -- denormalized from auth for display/search
  full_name     text,
  company_name  text,
  company_org_number text,                    -- Swedish org.nr (optional)
  locale        text not null default 'sv' check (locale in ('sv','en')),
  avatar_url    text,
  marketing_opt_in boolean not null default false,
  onboarded_at  timestamptz,                  -- null until first-run wizard done
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz                   -- GDPR soft-delete grace marker
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();  -- reuse M1 fn

-- Auto-provision a profile whenever an auth user is created. This is redefined
-- (create or replace) in the user_settings migration to also seed settings.
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
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ROLLBACK:
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop table if exists public.profiles;
