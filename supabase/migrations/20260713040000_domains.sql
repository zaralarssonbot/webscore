-- M5 — domains: a monitored website owned by a user.
-- See M5_SPEC.md §3.4, §7.3, §7.4. Additive, idempotent.

create table if not exists public.domains (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  normalized_domain text not null,            -- canonicalDomain() output, the join key
  display_name      text,                     -- user-facing label, defaults to domain
  is_primary        boolean not null default false,
  is_favorite       boolean not null default false,
  is_archived       boolean not null default false,
  verified          boolean not null default false,
  verification_method public.domain_verification_method,
  verification_token text,                    -- random, minted on add; checked by verify-domain
  verified_at       timestamptz,
  monitoring_enabled boolean not null default false,  -- scheduled rescan; requires verified
  last_analyzed_at  timestamptz,
  latest_report_id  uuid references public.reports(id) on delete set null,
  latest_score      integer,                  -- denormalized for fast dashboard render
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, normalized_domain)         -- a user can't add the same domain twice
);

create index if not exists domains_user_idx          on public.domains (user_id);
create index if not exists domains_user_active_idx    on public.domains (user_id) where is_archived = false;
create index if not exists domains_normalized_idx     on public.domains (normalized_domain);
create unique index if not exists domains_one_primary_per_user
  on public.domains (user_id) where is_primary = true;
create index if not exists domains_monitoring_idx
  on public.domains (monitoring_enabled, last_analyzed_at) where monitoring_enabled = true;

drop trigger if exists domains_set_updated_at on public.domains;
create trigger domains_set_updated_at
  before update on public.domains
  for each row execute function public.update_updated_at_column();

-- Free-tier cap: at most 25 ACTIVE (non-archived) domains per user. Enforced at
-- insert; archived rows do not count. See M5_SPEC.md §7.4.
create or replace function public.enforce_domain_limit()
returns trigger language plpgsql set search_path = public as $$
declare cnt integer;
begin
  if new.is_archived then
    return new;  -- archived rows are unbounded and don't count toward the cap
  end if;
  select count(*) into cnt from public.domains
    where user_id = new.user_id and is_archived = false;
  if cnt >= 25 then
    raise exception 'domain_limit_reached'
      using errcode = 'check_violation', hint = 'Max 25 aktiva domäner per konto.';
  end if;
  return new;
end $$;

drop trigger if exists domains_enforce_limit on public.domains;
create trigger domains_enforce_limit
  before insert on public.domains
  for each row execute function public.enforce_domain_limit();

-- Set a domain as the user's primary, clearing any previous primary. Runs under
-- the caller's RLS (security invoker) so it can only touch the caller's rows.
create or replace function public.set_primary_domain(p_domain_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.domains set is_primary = false
    where user_id = auth.uid() and is_primary = true and id <> p_domain_id;
  update public.domains set is_primary = true
    where id = p_domain_id and user_id = auth.uid();
end $$;

-- ROLLBACK:
--   drop function if exists public.set_primary_domain(uuid);
--   drop function if exists public.enforce_domain_limit();
--   drop table if exists public.domains;
