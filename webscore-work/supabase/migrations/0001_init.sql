-- ============================================================================
--  Webscore Work — initial schema (0001_init)
--  Multi-tenant quote / work-order / project system for service companies.
--
--  Every business table carries an organization_id for tenant isolation.
--  Row Level Security policies are defined separately in 0002_rls.sql.
--  This schema mirrors the domain model in src/lib/types.ts.
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
--  Enums (mirror the union types in src/lib/types.ts)
-- ---------------------------------------------------------------------------
create type role               as enum ('admin', 'supervisor', 'worker');
create type customer_type      as enum ('private', 'company');
create type address_type       as enum ('invoice', 'work');
create type inquiry_status      as enum ('new', 'contacted', 'visit_booked', 'quoting', 'converted', 'closed');
create type quote_status        as enum ('draft', 'sent', 'opened', 'change_requested', 'approved', 'declined', 'expired');
create type quote_line_kind     as enum ('labor', 'material', 'other');
create type approval_decision   as enum ('approved', 'declined', 'change_requested');
create type project_status      as enum ('planned', 'active', 'paused', 'waiting', 'completed', 'invoiced');
create type work_order_status   as enum ('unplanned', 'planned', 'in_progress', 'paused', 'waiting_material', 'review', 'completed', 'invoiced');
create type priority            as enum ('low', 'normal', 'high', 'urgent');
create type time_entry_status   as enum ('running', 'submitted', 'approved', 'rejected');
create type attachment_category as enum ('before', 'during', 'after', 'damage', 'deviation', 'material', 'receipt', 'other');
create type change_order_status as enum ('draft', 'sent', 'approved', 'declined');
create type invoice_draft_status as enum ('draft', 'approved', 'exported');
create type notification_kind   as enum (
  'work_order_new', 'assignment', 'time_changed', 'quote_opened', 'quote_approved',
  'quote_declined', 'change_order_pending', 'work_order_overdue', 'time_missing',
  'work_order_review'
);

-- ---------------------------------------------------------------------------
--  Organizations
-- ---------------------------------------------------------------------------
create table organizations (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  org_number               text not null,
  industry                 text not null default '',
  email                    text not null default '',
  phone                    text not null default '',
  address                  text not null default '',
  logo_text                text not null default '',
  default_vat_rate         numeric(5,2) not null default 25,
  currency                 text not null default 'SEK',
  payment_terms            text not null default '30 dagar netto',
  quote_terms              text not null default '',
  quote_number_prefix      text not null default 'OFF-',
  work_order_number_prefix text not null default 'AO-',
  created_at               timestamptz not null default now()
);

-- Users map 1:1 to a Supabase auth.users row via id (auth.uid()).
create table users (
  id              uuid primary key,           -- = auth.users.id
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  email           text not null,
  role            role not null default 'worker',
  title           text not null default '',
  phone           text not null default '',
  active          boolean not null default true,
  hourly_rate     numeric(10,2) not null default 0,
  color           text not null default '#6b7280',
  created_at      timestamptz not null default now()
);
create index users_org_idx on users(organization_id);

-- Membership join table: which orgs a given auth user may access + their role.
create table organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            role not null default 'worker',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_org_idx  on organization_members(organization_id);
create index organization_members_user_idx on organization_members(user_id);

-- One settings row per organization (extensible key/value-ish config).
create table organization_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  notification_prefs jsonb not null default '{}'::jsonb,
  appearance_prefs   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Customers
-- ---------------------------------------------------------------------------
create table customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type            customer_type not null default 'private',
  name            text not null,
  company_name    text,
  org_number      text,
  phone           text not null default '',
  email           text not null default '',
  notes           text,
  created_at      timestamptz not null default now()
);
create index customers_org_idx on customers(organization_id);

create table customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  label           text not null default '',
  type            address_type not null default 'invoice',
  street          text not null default '',
  postal_code     text not null default '',
  city            text not null default ''
);
create index customer_addresses_org_idx      on customer_addresses(organization_id);
create index customer_addresses_customer_idx on customer_addresses(customer_id);

-- ---------------------------------------------------------------------------
--  Inquiries
-- ---------------------------------------------------------------------------
create table inquiries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_name   text not null,
  company_name    text,
  phone           text not null default '',
  email           text not null default '',
  address         text not null default '',
  work_type       text not null default '',
  description     text not null default '',
  desired_date    date,
  source          text not null default 'Manuell',
  owner_id        uuid references users(id) on delete set null,
  status          inquiry_status not null default 'new',
  created_at      timestamptz not null default now()
);
create index inquiries_org_idx   on inquiries(organization_id);
create index inquiries_owner_idx on inquiries(owner_id);

-- ---------------------------------------------------------------------------
--  Quotes
-- ---------------------------------------------------------------------------
create table quotes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  number          text not null,
  customer_id     uuid not null references customers(id) on delete restrict,
  title           text not null,
  description     text not null default '',
  status          quote_status not null default 'draft',
  pricing_type    text not null default 'fixed' check (pricing_type in ('fixed', 'estimate')),
  valid_until     date,
  start_date      date,
  end_date        date,
  terms           text not null default '',
  payment_terms   text not null default '',
  public_token    text not null unique,
  owner_id        uuid not null references users(id) on delete restrict,
  project_id      uuid,  -- FK added after projects table (circular dependency)
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  opened_at       timestamptz,
  unique (organization_id, number)
);
create index quotes_org_idx      on quotes(organization_id);
create index quotes_customer_idx on quotes(customer_id);
create index quotes_owner_idx    on quotes(owner_id);

create table quote_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  quote_id        uuid not null references quotes(id) on delete cascade,
  kind            quote_line_kind not null default 'labor',
  description     text not null default '',
  quantity        numeric(12,2) not null default 0,
  unit            text not null default 'st',
  unit_price      numeric(12,2) not null default 0,
  discount_pct    numeric(5,2) not null default 0,
  vat_rate        numeric(5,2) not null default 25,
  position        integer not null default 0
);
create index quote_items_org_idx   on quote_items(organization_id);
create index quote_items_quote_idx on quote_items(quote_id);

create table quote_approvals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  quote_id        uuid not null references quotes(id) on delete cascade,
  decision        approval_decision not null,
  name            text not null,
  email           text not null,
  comment         text,
  terms_accepted  boolean not null default false,
  ip_address      text,
  decided_at      timestamptz not null default now()
);
create index quote_approvals_org_idx   on quote_approvals(organization_id);
create index quote_approvals_quote_idx on quote_approvals(quote_id);

-- ---------------------------------------------------------------------------
--  Projects
-- ---------------------------------------------------------------------------
create table projects (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  name               text not null,
  customer_id        uuid not null references customers(id) on delete restrict,
  quote_id           uuid references quotes(id) on delete set null,
  address            text not null default '',
  manager_id         uuid not null references users(id) on delete restrict,
  member_ids         uuid[] not null default '{}',
  start_date         date,
  end_date           date,
  budget             numeric(12,2) not null default 0,
  labor_budget_hours numeric(10,2) not null default 0,
  material_budget    numeric(12,2) not null default 0,
  status             project_status not null default 'planned',
  created_at         timestamptz not null default now()
);
create index projects_org_idx      on projects(organization_id);
create index projects_customer_idx on projects(customer_id);
create index projects_quote_idx    on projects(quote_id);

-- Now wire the circular quotes.project_id FK.
alter table quotes
  add constraint quotes_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;
create index quotes_project_idx on quotes(project_id);

-- ---------------------------------------------------------------------------
--  Work orders
-- ---------------------------------------------------------------------------
create table work_orders (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  number             text not null,
  customer_id        uuid not null references customers(id) on delete restrict,
  project_id         uuid references projects(id) on delete set null,
  address            text not null default '',
  title              text not null,
  description        text not null default '',
  instructions       text,
  supervisor_id      uuid not null references users(id) on delete restrict,
  date               date,
  start_time         text,
  estimated_end_time text,
  priority           priority not null default 'normal',
  status             work_order_status not null default 'unplanned',
  created_at         timestamptz not null default now(),
  unique (organization_id, number)
);
create index work_orders_org_idx      on work_orders(organization_id);
create index work_orders_customer_idx on work_orders(customer_id);
create index work_orders_project_idx  on work_orders(project_id);
create index work_orders_date_idx     on work_orders(date);

-- Many-to-many: work order ↔ assignee (user).
create table work_order_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  unique (work_order_id, user_id)
);
create index work_order_assignments_org_idx on work_order_assignments(organization_id);
create index work_order_assignments_wo_idx   on work_order_assignments(work_order_id);
create index work_order_assignments_user_idx on work_order_assignments(user_id);

-- Checklists belong to a work order; items belong to a checklist.
create table checklists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  title           text not null default 'Checklista',
  created_at      timestamptz not null default now()
);
create index checklists_org_idx on checklists(organization_id);
create index checklists_wo_idx  on checklists(work_order_id);

create table checklist_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  checklist_id    uuid not null references checklists(id) on delete cascade,
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  label           text not null,
  done            boolean not null default false,
  position        integer not null default 0
);
create index checklist_items_org_idx       on checklist_items(organization_id);
create index checklist_items_checklist_idx on checklist_items(checklist_id);

-- ---------------------------------------------------------------------------
--  Time entries
-- ---------------------------------------------------------------------------
create table time_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  user_id         uuid not null references users(id) on delete restrict,
  date            date not null,
  minutes         integer not null default 0,
  work_type       text not null default 'Arbete',
  comment         text,
  status          time_entry_status not null default 'submitted',
  started_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index time_entries_org_idx  on time_entries(organization_id);
create index time_entries_wo_idx   on time_entries(work_order_id);
create index time_entries_user_idx on time_entries(user_id);

-- ---------------------------------------------------------------------------
--  Materials (catalog) + material entries (used on a work order)
-- ---------------------------------------------------------------------------
create table materials (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  article_number  text,
  unit            text not null default 'st',
  purchase_price  numeric(12,2) not null default 0,
  customer_price  numeric(12,2) not null default 0,
  supplier        text,
  created_at      timestamptz not null default now()
);
create index materials_org_idx on materials(organization_id);

create table material_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  material_id     uuid references materials(id) on delete set null,
  name            text not null,
  article_number  text,
  quantity        numeric(12,2) not null default 0,
  unit            text not null default 'st',
  purchase_price  numeric(12,2) not null default 0,
  customer_price  numeric(12,2) not null default 0,
  supplier        text,
  comment         text,
  receipt_url     text,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index material_entries_org_idx on material_entries(organization_id);
create index material_entries_wo_idx  on material_entries(work_order_id);
create index material_entries_proj_idx on material_entries(project_id);

-- ---------------------------------------------------------------------------
--  Attachments
-- ---------------------------------------------------------------------------
create table attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id   uuid references work_orders(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  category        attachment_category not null default 'other',
  url             text not null,
  file_name       text not null,
  comment         text,
  uploaded_by     uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index attachments_org_idx  on attachments(organization_id);
create index attachments_wo_idx   on attachments(work_order_id);
create index attachments_proj_idx on attachments(project_id);

-- ---------------------------------------------------------------------------
--  Change orders (ÄTA)
-- ---------------------------------------------------------------------------
create table change_orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  work_order_id   uuid references work_orders(id) on delete set null,
  description     text not null,
  reason          text not null default '',
  estimated_hours numeric(10,2) not null default 0,
  price           numeric(12,2) not null default 0,
  status          change_order_status not null default 'draft',
  public_token    text not null unique,
  decided_by      text,
  decided_at      timestamptz,
  comment         text,
  created_at      timestamptz not null default now()
);
create index change_orders_org_idx  on change_orders(organization_id);
create index change_orders_proj_idx on change_orders(project_id);

create table change_order_approvals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  change_order_id uuid not null references change_orders(id) on delete cascade,
  decision        change_order_status not null check (decision in ('approved', 'declined')),
  name            text not null,
  comment         text,
  decided_at      timestamptz not null default now()
);
create index change_order_approvals_org_idx on change_order_approvals(organization_id);
create index change_order_approvals_co_idx  on change_order_approvals(change_order_id);

-- ---------------------------------------------------------------------------
--  Invoice drafts
-- ---------------------------------------------------------------------------
create table invoice_drafts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  number          text not null,
  customer_id     uuid not null references customers(id) on delete restrict,
  project_id      uuid references projects(id) on delete set null,
  work_order_id   uuid references work_orders(id) on delete set null,
  reference       text not null default '',
  status          invoice_draft_status not null default 'draft',
  created_at      timestamptz not null default now(),
  unique (organization_id, number)
);
create index invoice_drafts_org_idx      on invoice_drafts(organization_id);
create index invoice_drafts_customer_idx on invoice_drafts(customer_id);
create index invoice_drafts_proj_idx     on invoice_drafts(project_id);

create table invoice_draft_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  invoice_draft_id uuid not null references invoice_drafts(id) on delete cascade,
  description      text not null,
  quantity         numeric(12,2) not null default 0,
  unit             text not null default 'st',
  unit_price       numeric(12,2) not null default 0,
  vat_rate         numeric(5,2) not null default 25,
  position         integer not null default 0
);
create index invoice_draft_items_org_idx on invoice_draft_items(organization_id);
create index invoice_draft_items_inv_idx on invoice_draft_items(invoice_draft_id);

-- ---------------------------------------------------------------------------
--  Notifications & activity log
-- ---------------------------------------------------------------------------
create table notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid references users(id) on delete cascade,  -- null = whole org
  kind            notification_kind not null,
  title           text not null,
  body            text not null default '',
  href            text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index notifications_org_idx  on notifications(organization_id);
create index notifications_user_idx on notifications(user_id);

create table activity_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id        uuid references users(id) on delete set null,
  actor_name      text not null default '',
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  href            text,
  created_at      timestamptz not null default now()
);
create index activity_logs_org_idx on activity_logs(organization_id);
