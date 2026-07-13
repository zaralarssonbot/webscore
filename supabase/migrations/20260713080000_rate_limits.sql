-- M5 — rate_limits: per-subject/per-action fixed-window counters.
-- Incremented by Edge Functions (service role) via atomic upsert. Old windows
-- swept by the daily cron. RLS: no policies → service role only.
-- See M5_SPEC.md §3.8, §15.3.

create table if not exists public.rate_limits (
  id         bigint generated always as identity primary key,
  subject    text not null,     -- 'user:<uuid>' or 'ip:<hash>'
  action     text not null,     -- 'analyze','rescan','verify','export','delete'
  window_start timestamptz not null,
  count      integer not null default 0,
  unique (subject, action, window_start)
);

create index if not exists rate_limits_lookup_idx on public.rate_limits (subject, action, window_start);

-- Atomic increment helper. Returns the new count within the window. Callable by
-- service role only (enforced by RLS on the table + function security invoker).
create or replace function public.bump_rate_limit(
  p_subject text, p_action text, p_window_start timestamptz
) returns integer language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  insert into public.rate_limits (subject, action, window_start, count)
  values (p_subject, p_action, p_window_start, 1)
  on conflict (subject, action, window_start)
  do update set count = rate_limits.count + 1
  returning rate_limits.count into new_count;
  return new_count;
end $$;

revoke all on function public.bump_rate_limit(text, text, timestamptz) from anon, authenticated;

-- ROLLBACK:
--   drop function if exists public.bump_rate_limit(text, text, timestamptz);
--   drop table if exists public.rate_limits;
