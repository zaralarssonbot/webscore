-- ============================================================================
--  Webscore Work — Row Level Security (0002_rls)
--
--  Tenant isolation: a signed-in user may only read/write rows whose
--  organization_id is one of the organizations they are a member of.
--
--  The membership lookup is centralised in auth_org_ids() so every policy
--  stays identical and easy to audit. Public (unauthenticated) access to a
--  single quote / change order by token is intentionally NOT granted through
--  RLS — it is exposed via SECURITY DEFINER RPCs (stub at the bottom) so the
--  surface stays minimal and explicit.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Helper: the set of organization_ids the current auth user belongs to.
--  STABLE + SECURITY DEFINER so the policy can read organization_members
--  without recursively triggering its own RLS.
-- ---------------------------------------------------------------------------
create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from organization_members
  where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
--  Enable RLS on every table.
-- ---------------------------------------------------------------------------
alter table organizations          enable row level security;
alter table users                  enable row level security;
alter table organization_members   enable row level security;
alter table organization_settings  enable row level security;
alter table customers              enable row level security;
alter table customer_addresses     enable row level security;
alter table inquiries              enable row level security;
alter table quotes                 enable row level security;
alter table quote_items            enable row level security;
alter table quote_approvals        enable row level security;
alter table projects               enable row level security;
alter table work_orders            enable row level security;
alter table work_order_assignments enable row level security;
alter table checklists             enable row level security;
alter table checklist_items        enable row level security;
alter table time_entries           enable row level security;
alter table materials              enable row level security;
alter table material_entries       enable row level security;
alter table attachments            enable row level security;
alter table change_orders          enable row level security;
alter table change_order_approvals enable row level security;
alter table invoice_drafts         enable row level security;
alter table invoice_draft_items    enable row level security;
alter table notifications          enable row level security;
alter table activity_logs          enable row level security;

-- ---------------------------------------------------------------------------
--  Organizations: a member may see and update their own org.
-- ---------------------------------------------------------------------------
create policy "org members can read their organization"
  on organizations for select
  using (id in (select auth_org_ids()));

create policy "org members can update their organization"
  on organizations for update
  using (id in (select auth_org_ids()))
  with check (id in (select auth_org_ids()));

-- ---------------------------------------------------------------------------
--  organization_members: a user can read membership rows for orgs they
--  belong to (so they can see colleagues), and always their own row.
-- ---------------------------------------------------------------------------
create policy "read memberships in my orgs"
  on organization_members for select
  using (organization_id in (select auth_org_ids()) or user_id = auth.uid());

-- ---------------------------------------------------------------------------
--  Tenant tables: identical policy — every command is constrained to the
--  caller's organizations. Each statement below applies the same predicate
--  to SELECT / INSERT / UPDATE / DELETE via FOR ALL.
--
--  USING      → which existing rows are visible / mutable.
--  WITH CHECK → which new/updated rows are allowed (prevents writing into
--               another tenant's organization_id).
-- ---------------------------------------------------------------------------

-- users (profiles within an org)
create policy "tenant isolation" on users
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on organization_settings
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on customers
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on customer_addresses
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on inquiries
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on quotes
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on quote_items
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on quote_approvals
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on projects
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on work_orders
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on work_order_assignments
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on checklists
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on checklist_items
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on time_entries
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on materials
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on material_entries
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on attachments
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on change_orders
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on change_order_approvals
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on invoice_drafts
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on invoice_draft_items
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy "tenant isolation" on activity_logs
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

-- Notifications: scoped to the org, and personal notifications (user_id set)
-- are only visible to that user; org-wide notifications (user_id null) are
-- visible to all members of the org.
create policy "read my notifications" on notifications
  for select using (
    organization_id in (select auth_org_ids())
    and (user_id is null or user_id = auth.uid())
  );

create policy "write notifications in my org" on notifications
  for all using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

-- ============================================================================
--  Public token access (SECURITY DEFINER RPC) — STUB
--
--  Customers receive a link like /quotes/p/<token> with no login. RLS denies
--  anonymous reads, so a SECURITY DEFINER function bypasses RLS but returns
--  ONLY the single row matching the token (never a full table scan to the
--  client). Implement and harden before going live (rate limit, audit, only
--  expose non-sensitive columns).
--
--  create or replace function get_quote_by_token(token text)
--  returns jsonb
--  language sql
--  stable
--  security definer
--  set search_path = public
--  as $$
--    select to_jsonb(q) from quotes q where q.public_token = token;
--  $$;
--
--  grant execute on function get_quote_by_token(text) to anon, authenticated;
--
--  -- A matching get_change_order_by_token(token text) follows the same shape.
-- ============================================================================
