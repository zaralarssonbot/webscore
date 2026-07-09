-- ============================================================================
--  Webscore Work — production hardening (0003)
--
--  Builds on 0001 (schema) + 0002 (tenant RLS) and adds the pieces needed to
--  run for real paying customers:
--
--    1. Role helpers (admin / supervisor / worker) for defense-in-depth RLS.
--    2. Role-gated write policies on the sales/finance tables.
--    3. Signup provisioning: handle_new_user() trigger + provision_organization().
--    4. Public (tokenised, no-login) access via SECURITY DEFINER RPCs:
--         - read  : get_quote_public / get_change_order_public
--         - decide: decide_quote_public / decide_change_order_public
--    5. Storage buckets (attachments / receipts / documents) + org-scoped
--       storage RLS so files are isolated per tenant.
--
--  Re-runnable: every object is created with drop-if-exists / create-or-replace.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Role helpers
--     auth_role(org) → the caller's role within that organization (or null).
--     STABLE + SECURITY DEFINER so they don't recurse into members' own RLS.
-- ---------------------------------------------------------------------------
create or replace function auth_role(org uuid)
returns role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from organization_members m
  where m.user_id = auth.uid() and m.organization_id = org
  limit 1;
$$;

create or replace function auth_is_manager(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role(org) in ('admin', 'supervisor'), false);
$$;

create or replace function auth_is_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role(org) = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
--  2. Role-gated write policies (defense in depth — server actions also check).
--
--  Pattern per table: keep SELECT open to any member of the org (set in 0002
--  via the FOR ALL policy, which we now split), and restrict writes by role.
--  We DROP the broad "tenant isolation" FOR ALL policy on the sensitive tables
--  and replace it with a read policy + a role-scoped write policy.
-- ---------------------------------------------------------------------------

-- Helper to reduce repetition is not possible for policies, so we spell each out.

-- Customers & addresses, inquiries, projects, materials catalog, change orders,
-- work orders + planning: writable by managers (admin/supervisor); readable by
-- any member.
do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'customer_addresses', 'inquiries', 'projects',
    'materials', 'change_orders', 'work_orders', 'work_order_assignments',
    'checklists', 'checklist_items'
  ]
  loop
    execute format('drop policy if exists "tenant isolation" on %I', t);
    execute format(
      'create policy "members read" on %I for select using (organization_id in (select auth_org_ids()))',
      t);
    execute format(
      'create policy "managers write" on %I for all
         using (organization_id in (select auth_org_ids()) and auth_is_manager(organization_id))
         with check (organization_id in (select auth_org_ids()) and auth_is_manager(organization_id))',
      t);
  end loop;
end $$;

-- Quotes, quote items/approvals, invoice drafts/items: admin-only writes
-- (mirrors can.createQuotes / can.createInvoices = admin). Readable by members.
do $$
declare t text;
begin
  foreach t in array array[
    'quotes', 'quote_items', 'quote_approvals',
    'invoice_drafts', 'invoice_draft_items', 'organization_settings'
  ]
  loop
    execute format('drop policy if exists "tenant isolation" on %I', t);
    execute format(
      'create policy "members read" on %I for select using (organization_id in (select auth_org_ids()))',
      t);
    execute format(
      'create policy "admins write" on %I for all
         using (organization_id in (select auth_org_ids()) and auth_is_admin(organization_id))
         with check (organization_id in (select auth_org_ids()) and auth_is_admin(organization_id))',
      t);
  end loop;
end $$;

-- time_entries / material_entries / attachments stay member-writable
-- (workers register their own time, material and photos). The FOR ALL
-- "tenant isolation" policy from 0002 already covers this — left unchanged.

-- ---------------------------------------------------------------------------
--  3. Signup provisioning
--
--  provision_organization() — called from the new-user trigger. Creates the
--  org, the owner profile, an admin membership and a settings row, all in one
--  transaction. Driven by the auth user's raw_user_meta_data:
--
--     { "organization_name": "Acme AB", "org_number": "556677-8899",
--       "full_name": "Anna Andersson" }
--
--  If "organization_id" is present instead (an invited teammate), the user is
--  attached to that org with the supplied "role" (default 'worker').
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_org_id    uuid;
  v_role      role;
  v_name      text := coalesce(nullif(meta->>'full_name', ''), split_part(new.email, '@', 1));
begin
  if (meta ? 'organization_id') then
    -- Invited teammate: attach to an existing org.
    v_org_id := (meta->>'organization_id')::uuid;
    v_role   := coalesce((meta->>'role')::role, 'worker');
  else
    -- Self-serve signup: create a brand-new organization, caller becomes admin.
    insert into organizations (name, org_number)
    values (
      coalesce(nullif(meta->>'organization_name', ''), v_name || 's företag'),
      coalesce(nullif(meta->>'org_number', ''), '')
    )
    returning id into v_org_id;

    insert into organization_settings (organization_id) values (v_org_id);
    v_role := 'admin';
  end if;

  insert into users (id, organization_id, name, email, role)
  values (new.id, v_org_id, v_name, new.email, v_role)
  on conflict (id) do nothing;

  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, v_role)
  on conflict (organization_id, user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
--  4. Public, tokenised access (no login)
--
--  RLS denies anonymous reads, so customer-facing quote / change-order pages
--  go through these SECURITY DEFINER functions. Each takes the opaque token,
--  returns ONLY the single matching record (never a table scan to the client),
--  and exposes only the columns a customer needs.
-- ---------------------------------------------------------------------------

-- Read a quote by its public token: quote + line items + customer + org branding.
create or replace function get_quote_public(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'quote', to_jsonb(q) - 'organization_id' - 'owner_id',
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.position)
      from quote_items i where i.quote_id = q.id
    ), '[]'::jsonb),
    'customer', jsonb_build_object(
      'name', c.name, 'company_name', c.company_name,
      'email', c.email, 'type', c.type
    ),
    'organization', jsonb_build_object(
      'name', o.name, 'org_number', o.org_number, 'logo_text', o.logo_text,
      'email', o.email, 'phone', o.phone, 'address', o.address,
      'payment_terms', o.payment_terms, 'currency', o.currency
    )
  )
  from quotes q
  join customers c     on c.id = q.customer_id
  join organizations o on o.id = q.organization_id
  where q.public_token = p_token;
$$;

-- Record a customer's decision on a quote (approve / decline / request change).
create or replace function decide_quote_public(
  p_token   text,
  p_decision approval_decision,
  p_name    text,
  p_email   text,
  p_comment text default null,
  p_terms_accepted boolean default false,
  p_ip      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q quotes%rowtype;
begin
  select * into q from quotes where public_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if q.status in ('approved', 'declined') then
    return jsonb_build_object('ok', false, 'error', 'already_decided');
  end if;

  insert into quote_approvals (
    organization_id, quote_id, decision, name, email, comment,
    terms_accepted, ip_address
  ) values (
    q.organization_id, q.id, p_decision, p_name, p_email, p_comment,
    p_terms_accepted, p_ip
  );

  update quotes
  set status = case p_decision
    when 'approved' then 'approved'::quote_status
    when 'declined' then 'declined'::quote_status
    else 'change_requested'::quote_status end
  where id = q.id;

  insert into notifications (organization_id, kind, title, body, href)
  values (
    q.organization_id,
    case p_decision
      when 'approved' then 'quote_approved'::notification_kind
      when 'declined' then 'quote_declined'::notification_kind
      else 'change_order_pending'::notification_kind end,
    case p_decision
      when 'approved' then 'Offert godkänd'
      when 'declined' then 'Offert avböjd'
      else 'Ändring begärd' end,
    p_name || ' svarade på ' || q.number || ' – ' || q.title || '.',
    '/quotes/' || q.id
  );

  insert into activity_logs (organization_id, actor_name, action, entity_type, entity_id, href)
  values (q.organization_id, p_name, 'svarade på offert (' || p_decision || ')',
          'quote', q.id, '/quotes/' || q.id);

  return jsonb_build_object('ok', true);
end $$;

-- Mark a quote opened the first time the public page is viewed.
create or replace function mark_quote_opened_public(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare q quotes%rowtype;
begin
  select * into q from quotes where public_token = p_token;
  if found and q.status = 'sent' then
    update quotes set status = 'opened', opened_at = now() where id = q.id;
    insert into notifications (organization_id, kind, title, body, href)
    values (q.organization_id, 'quote_opened', 'Offert öppnad',
            'Kunden öppnade ' || q.number || ' – ' || q.title || '.',
            '/quotes/' || q.id);
  end if;
end $$;

-- Read a change order (ÄTA) by token.
create or replace function get_change_order_public(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'change_order', to_jsonb(co) - 'organization_id',
    'organization', jsonb_build_object(
      'name', o.name, 'org_number', o.org_number, 'logo_text', o.logo_text
    )
  )
  from change_orders co
  join organizations o on o.id = co.organization_id
  where co.public_token = p_token;
$$;

-- Record a customer's decision on a change order.
create or replace function decide_change_order_public(
  p_token    text,
  p_decision change_order_status,
  p_name     text,
  p_comment  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare co change_orders%rowtype;
begin
  if p_decision not in ('approved', 'declined') then
    return jsonb_build_object('ok', false, 'error', 'bad_decision');
  end if;
  select * into co from change_orders where public_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if co.status in ('approved', 'declined') then
    return jsonb_build_object('ok', false, 'error', 'already_decided');
  end if;

  update change_orders
  set status = p_decision, decided_by = p_name, decided_at = now(), comment = p_comment
  where id = co.id;

  insert into change_order_approvals (organization_id, change_order_id, decision, name, comment)
  values (co.organization_id, co.id, p_decision, p_name, p_comment);

  insert into notifications (organization_id, kind, title, body, href)
  values (co.organization_id, 'change_order_pending',
          case p_decision when 'approved' then 'Tilläggsarbete godkänt'
                          else 'Tilläggsarbete avböjt' end,
          p_name || ' svarade på ett tilläggsarbete.',
          '/projects/' || co.project_id);

  return jsonb_build_object('ok', true);
end $$;

-- Expose only these functions to anonymous + authenticated callers.
grant execute on function get_quote_public(text)              to anon, authenticated;
grant execute on function mark_quote_opened_public(text)       to anon, authenticated;
grant execute on function decide_quote_public(text, approval_decision, text, text, text, boolean, text) to anon, authenticated;
grant execute on function get_change_order_public(text)        to anon, authenticated;
grant execute on function decide_change_order_public(text, change_order_status, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
--  5. Storage buckets + org-scoped RLS
--
--  Object key convention: "<organization_id>/<scope>/<file>" so the first path
--  segment identifies the tenant. storage.foldername(name)[1] = the org id.
--
--    attachments — work photos (before/during/after). Public read.
--    documents   — generated quote / invoice PDFs. Public read.
--    receipts    — material receipts. PRIVATE — access via signed URLs only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', true),
  ('documents',   'documents',   true),
  ('receipts',    'receipts',    false)
on conflict (id) do nothing;

-- Helper: the org id encoded in an object's path.
create or replace function storage_object_org(name text)
returns uuid
language sql
immutable
as $$
  select nullif((storage.foldername(name))[1], '')::uuid;
$$;

-- Write access (insert/update/delete) on all three buckets requires the caller
-- to be a member of the org whose id prefixes the object path.
drop policy if exists "ws upload to own org" on storage.objects;
create policy "ws upload to own org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('attachments', 'documents', 'receipts')
    and storage_object_org(name) in (select auth_org_ids())
  );

drop policy if exists "ws update own org" on storage.objects;
create policy "ws update own org" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('attachments', 'documents', 'receipts')
    and storage_object_org(name) in (select auth_org_ids())
  );

drop policy if exists "ws delete own org" on storage.objects;
create policy "ws delete own org" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('attachments', 'documents', 'receipts')
    and storage_object_org(name) in (select auth_org_ids())
  );

-- Read access to the PRIVATE receipts bucket: members of the owning org only
-- (public buckets are served via their public URL and need no select policy).
drop policy if exists "ws read receipts own org" on storage.objects;
create policy "ws read receipts own org" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and storage_object_org(name) in (select auth_org_ids())
  );
