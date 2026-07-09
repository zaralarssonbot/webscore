# Supabase — database schema & RLS

This folder holds the PostgreSQL schema for **Webscore Work**. The migrations
mirror the domain model in `src/lib/types.ts` exactly (tables, enums and
relationships) so the app can be moved from the in-memory demo store to a real
Postgres database with minimal changes.

## Migrations

| File | Purpose |
| --- | --- |
| `migrations/0001_init.sql` | Enums, tables, foreign keys and indexes for every business entity. |
| `migrations/0002_rls.sql` | Enables Row Level Security on every table and adds tenant-isolation policies. |
| `migrations/0003_storage_auth_rpc.sql` | Role helpers + role-gated write policies, signup provisioning trigger, public-token RPCs (implemented, not a stub), and Storage buckets + storage RLS. |

See **[../SUPABASE.md](../SUPABASE.md)** for the full provisioning guide (env,
first user, storage, GDPR).

### Run them

With the Supabase CLI (recommended — applies everything in `migrations/` in order):

```bash
supabase db push
```

Or apply directly with `psql` against any Postgres 14+ instance:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
```

Order matters: `0001` must run before `0002`.

## What RLS does here

Every business table carries an `organization_id`. Row Level Security ensures a
signed-in user can only read or write rows belonging to an organization they are
a member of. The membership lookup is centralised in one helper:

```sql
auth_org_ids()  -- returns the set of organization_ids for auth.uid()
```

Each tenant table then uses the same predicate
(`organization_id in (select auth_org_ids())`) in both `USING` (visible rows)
and `WITH CHECK` (allowed writes), so a tenant can never read or insert into
another tenant's data. Notifications add an extra rule so personal notifications
are only visible to their recipient.

### Public (tokenised) access

Customers approve quotes and change orders via a public link with no login. RLS
denies anonymous reads, so this is handled by `SECURITY DEFINER` RPCs that return
only the single row matching the token, with sensitive columns stripped. These
are **implemented** in `0003_storage_auth_rpc.sql`
(`get_quote_public`, `decide_quote_public`, `mark_quote_opened_public`,
`get_change_order_public`, `decide_change_order_public`). Add rate limiting and
consider token expiry before high-traffic production use.

## Note: the running app uses an in-memory demo store

The app you can run today (`src/lib/db`) is an **in-memory store** seeded from
`src/lib/db/seed.ts`. It mirrors this schema field-for-field and the read/write
layers (`src/lib/queries.ts`, `src/lib/actions.ts`) already scope every access
by `organizationId` — the same isolation these RLS policies enforce. Swapping
the demo store for a Supabase client is therefore a localised change: the rest
of the app only depends on the shapes in `src/lib/types.ts`.
