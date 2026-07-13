# M6 — Payments & Subscriptions

**Status:** Specification (blueprint only — not implemented)
**Depends on (frozen):** M0 landing · M1 analysis · M2 reports · M3 AI · M4 PDF · M5 accounts/dashboard
**Constraint:** M6 is **strictly additive**. No frozen M0–M5 table, column, policy, Edge Function, route, or the agency `/pricing` page may be modified unless fixing a *critical production bug*. The one controlled evolution M6 requires of an M5 object (the `enforce_domain_limit` trigger → entitlement-aware) is called out explicitly in §7.6 and done via `create or replace` in a new migration.

---

## 0. Audit (pre-work)

### 0.1 What exists and is monetizable today

| Capability | Where | M6 treatment |
| --- | --- | --- |
| Anonymous one-shot analysis → public `/analys/:id` | M1/M2, `analyze-website`+`save-report`, RLS public-read | **Stays free & unchanged forever** (lead magnet). Never gated. |
| Grounded AI insight | M3 `ai-insight.ts` (Gemini) + deterministic fallback | Gate: Free = deterministic fallback only; Pro+ = full grounded AI. |
| Branded PDF report | M4 `render-pdf` (private bucket, signed URL) | Gate: monthly quota per plan. |
| Accounts, dashboard, history, trends | M5 `profiles/domains/reports/notifications` | Base of the SaaS; gated by plan limits. |
| Domain management (cap **25**, DB trigger) | M5 `domains` + `enforce_domain_limit()` | Cap becomes **plan-driven** (§7.6). |
| Scheduled monitoring / rescan | M5 `rescan-domain`, `domains.monitoring_enabled`, `domains_due_for_rescan()` | Gate: Free none, Pro weekly, Business daily. |
| Competitor tracking | `find-competitors`, `google-business-lookup`, `lookup-company` | Gate: Free none, Pro/Business limited. |
| Usage metering substrate | M5 `rate_limits` + `bump_rate_limit()` | Reused/extended for monthly usage counters (§7.4). |
| Billing alerts substrate | M5 `notifications` + `notification_type` enum | Extended with billing event types (§12). |
| Plan cache home | M5 `profiles` | Add denormalized `plan` column (§7.5). |

### 0.2 What does NOT exist (build in M6)

No payment processor, no `stripe_customers`/`subscriptions`/`usage_counters`/`plan_entitlements`/`subscription_events`/`invoices`, no entitlement resolution, no checkout/portal/webhook functions, no billing UI, no plan-aware gating. `MAX_DOMAINS_PER_USER = 25` is a hardcoded constant in code + DB trigger.

### 0.3 Load-bearing decisions forced by the audit

1. **Two pricing axes stay separate.** The frozen agency `/pricing` (website-building packages, SEK, per-project) is untouched. M6 adds a **SaaS subscription** surface (`/plans` marketing + `/app/billing` in-app). No route or copy of the agency page changes.
2. **Stripe is the payment processor & source of truth.** The DB mirrors Stripe via signed webhooks; entitlements are resolved from the mirrored subscription. The client never asserts its own plan.
3. **Gating is server-authoritative and additive.** A shared `_shared/entitlements.ts` is consulted at the start of the *authenticated* path of gated functions — exactly the additive pattern M5 used to attach ownership in `save-report`. The anonymous path is never touched.
4. **Free is a real, logged-in tier**, not "no account". Anonymous visitors keep the unlimited free one-shot public report; a Free *account* adds persistence with small caps.
5. **No teams / public API / SSO exist yet** (M5 non-goals). M6 sells single-seat plans; Enterprise entitlement flags reserve `seats`, `api_access`, `sso` as **future** capabilities (M7+), gated but not yet functional — clearly marked so nothing is over-promised.

---

## 1. Vision

Turn the Webscore SaaS into a self-serve, revenue-generating product. A visitor still gets a free instant analysis. A **Free account** persists a little. **Pro** unlocks the full grounded AI, branded PDFs, weekly monitoring, and real domain coverage for solo owners and freelancers. **Business** adds daily monitoring, competitor tracking, and high quotas for agencies. **Enterprise** is a custom contract (invoice billing, custom limits, priority support). Billing is Stripe-native: self-serve checkout, a customer portal for cards/cancellation, automatic VAT, trials, dunning, and hosted invoices — with entitlements enforced on the server on every gated action.

**Non-goals for M6:** teams/multi-seat collaboration, public REST API, SSO/SAML, marketplace, usage-based metered billing (all fixed-tier + quotas), reselling the agency service through Stripe.

---

## 2. Business strategy

- **Model:** freemium → self-serve subscription (monthly + annual) with a **14-day Pro trial** (card required, cancel anytime). Enterprise is sales-assisted, billed by Stripe Invoicing.
- **Anchor & upsell:** the free anonymous report drives signups; Free-account limits (1 domain, 5 analyses/mo, deterministic AI, no monitoring) create natural upgrade moments surfaced by contextual prompts (§9.7).
- **Annual incentive:** 2 months free on annual (≈17% off) to improve cash flow and reduce churn.
- **Currency & market:** SEK primary, `exkl. moms`; Stripe Tax handles Swedish 25% VAT and EU B2B reverse charge (VAT ID collected at checkout). Expandable to EUR later via additional Stripe Prices (config-only).
- **Churn control:** dunning + grace period before downgrade; downgrade is graceful (retain data, restrict actions) never destructive.
- **Guardrails:** hard server-side quotas prevent cost blowouts (Gemini/Firecrawl/PageSpeed/Cloudflare render spend scales with paid usage only).

---

## 3. Pricing model

All prices SEK, `exkl. moms`. Annual = 10× monthly (2 months free).

| Plan | Monthly | Annual | Stripe | Audience |
| --- | --- | --- | --- | --- |
| **Free** | 0 | 0 | no subscription | Try it, 1 site |
| **Pro** | 249 kr | 2 490 kr | Price(monthly), Price(annual) | Solo owners, freelancers |
| **Business** | 799 kr | 7 990 kr | Price(monthly), Price(annual) | Agencies, multi-site |
| **Enterprise** | custom | custom | Invoice / custom Price | Large / custom needs |

- **Trial:** 14 days on Pro (and Business), card required, `trial_end` tracked; converts automatically unless canceled.
- **Coupons/promo codes:** Stripe promotion codes (percentage/amount/duration) enabled on Checkout.
- **Proration:** Stripe default proration on upgrade (immediate) / downgrade (at period end).

> Numbers are the recommended defaults; they live in **one** place (`plan_entitlements` seed + Stripe Prices) and are changed by editing the seed + Stripe, never scattered.

---

## 4. Feature gating — plan → capability matrix

Authoritative limits live in `plan_entitlements` (§7.3); this table is the seed. `null` = unlimited. Anonymous public analysis is **not** in this table (always free/unlimited-by-IP, unchanged).

| Capability (metric key) | Free | Pro | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Owned analyses / month (`analyses_month`) | 5 | 100 | 1 000 | null (custom) |
| Active domains (`domains_active`) | 1 | 10 | 50 | null |
| Branded PDF / month (`pdf_month`) | 1 | 50 | null | null |
| History retention (`history_days`) | 30 | 365 | null | null |
| AI insights (`ai_level`) | `fallback` | `grounded` | `grounded` | `grounded` |
| Monitoring cadence (`monitoring`) | `none` | `weekly` | `daily` | `daily` |
| Competitors per domain (`competitors_per_domain`) | 0 | 3 | 10 | null |
| Priority support (`support`) | `community` | `email` | `priority` | `dedicated` |
| Seats (`seats`) — *reserved, M7+* | 1 | 1 | 1 | custom |
| API access (`api_access`) — *reserved, M7+* | false | false | false | true |
| SSO (`sso`) — *reserved, M7+* | false | false | false | true |
| PDF watermark (`pdf_watermark`) | true | false | false | false |

**Gate points (server-authoritative):**
- `analyses_month` → checked in `save-report` **owned path** (authenticated). Anonymous unchanged.
- `domains_active` → `enforce_domain_limit` trigger reads the user's limit (§7.6).
- `pdf_month` → `render-pdf` before render; Free adds a watermark via the template flag.
- `history_days` → history/trend queries filter `created_at >= now() - history_days` for the plan (Free sees 30 days; higher plans unlimited). Reports are never deleted.
- `ai_level` → `analyze-website` summary phase: Free forces the deterministic fallback (Gemini not called for owned Free analyses); Pro+ full grounded AI.
- `monitoring` → `verify-domain` monitoring toggle + `domains_due_for_rescan` cadence.
- `competitors_per_domain` → `find-competitors` result cap; 0 = feature hidden.

---

## 5. Subscription architecture

```
        Browser (client)                      Supabase Edge (Deno, service role)                 Stripe
  ┌───────────────────────┐   create-checkout   ┌────────────────────────────┐   Checkout API   ┌──────────┐
  │ /app/billing UI       │────────────────────▶│ create-checkout-session    │─────────────────▶│ Checkout │
  │ upgrade / manage       │   create-portal     │ create-portal-session      │   Portal API     │ Portal   │
  │ entitlements + usage   │◀────────────────────│ get-entitlements (RLS view)│                  │ Invoices │
  └───────────────────────┘                      └────────────────────────────┘                  └────┬─────┘
            ▲  reads (RLS)                                    ▲  writes (service role)                  │ webhook (signed)
            │                                                 │                                         ▼
      ┌─────┴───────────────────────────────────────────────┴───────────┐          ┌─────────────────────────────┐
      │ Postgres: stripe_customers, subscriptions, usage_counters,        │◀─────────│ stripe-webhook (sig-verified,│
      │ plan_entitlements, subscription_events, invoices, profiles.plan   │  sync    │ replay-protected, idempotent)│
      └───────────────────────────────────────────────────────────────────┘          └─────────────────────────────┘
```

- **Source of truth:** Stripe. The DB `subscriptions` row is a mirror kept eventually-consistent by `stripe-webhook`. Reads for gating use the mirror (fast, RLS-safe); the webhook reconciles on every relevant event.
- **Entitlement resolution:** `resolveEntitlements(userId)` = active `subscriptions.plan` (or `free` if none/expired) → `plan_entitlements` limits → merged with any `entitlement_overrides` (Enterprise/custom). Pure + cacheable; the single decision function used by every gate.
- **Usage:** `usage_counters` rows per `(user_id, metric, period_start)` incremented atomically; reset by rolling monthly window aligned to the subscription's `current_period_start` (or calendar month for Free).

---

## 6. Stripe architecture

### 6.1 Objects (created in Stripe, referenced by ID)
- **Products:** `Webscore Pro`, `Webscore Business`, `Webscore Enterprise`.
- **Prices:** `pro_monthly`, `pro_annual`, `business_monthly`, `business_annual` (recurring, SEK). Enterprise = custom Price or Invoice items. Price IDs stored as function secrets + in `plan_entitlements.stripe_price_ids`.
- **Customer:** one Stripe Customer per user, linked in `stripe_customers` (`user_id ↔ stripe_customer_id`), created lazily on first checkout with `metadata.user_id` and `client_reference_id`.

### 6.2 Checkout
`create-checkout-session` (auth) → Stripe Checkout Session, `mode: 'subscription'`, `line_items:[{price, quantity:1}]`, `customer` (existing or `customer_creation`), `client_reference_id: user_id`, `subscription_data.trial_period_days: 14` (Pro/Business first-time), `allow_promotion_codes: true`, `automatic_tax: {enabled:true}`, `tax_id_collection:{enabled:true}`, `billing_address_collection:'required'`, success/cancel URLs to `/app/billing?status=...`. Returns hosted URL. **Idempotency-Key** per attempt.

### 6.3 Customer Portal
`create-portal-session` (auth) → Billing Portal Session for the user's customer; portal configured to allow: update payment method, cancel (at period end), switch plan (upgrade/downgrade among allowed prices), view/download invoices. Returns URL.

### 6.4 Subscriptions
Mirrored to `subscriptions`: `status` (`trialing|active|past_due|canceled|incomplete|incomplete_expired|unpaid`), `plan`, `price_id`, `current_period_start/end`, `cancel_at_period_end`, `trial_end`, `quantity`. Plan derived from `price_id`.

### 6.5 Invoices
Read live from Stripe for the billing page via `list-invoices` (auth) **or** mirrored minimally to `invoices` (id, number, amount_due, currency, status, hosted_invoice_url, pdf_url, created) by webhook for fast render. Blueprint uses the **mirror** (fast, offline-capable), refreshed on `invoice.*` webhooks.

### 6.6 Trials
`subscription_data.trial_period_days`. `customer.subscription.trial_will_end` (fires ~3 days before) → `trial_ending` notification. On trial end Stripe attempts the first charge; success → `active`, failure → `past_due` dunning.

### 6.7 Coupons
Stripe promotion codes; `allow_promotion_codes:true` on Checkout. No custom coupon logic in-app.

### 6.8 Taxes / VAT
**Stripe Tax** (`automatic_tax.enabled`). Swedish VAT 25% on B2C; EU B2B reverse charge when a valid VAT ID is provided (`tax_id_collection`). Origin address = the Swedish company. Tax shown on invoices by Stripe; nothing computed in-app.

### 6.9 Failed payments (dunning)
Stripe Smart Retries + configured retry schedule. `invoice.payment_failed` → `payment_failed` notification + set `subscriptions.status=past_due` (entitlements enter **grace**: keep Pro features for a grace window `GRACE_DAYS=7`). On `customer.subscription.updated → unpaid/canceled` or final failure → downgrade entitlements to Free (data retained). Recovery (`invoice.paid`) restores.

### 6.10 Webhooks — handled events
`checkout.session.completed`, `customer.subscription.created|updated|deleted`, `customer.subscription.trial_will_end`, `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`. Each is signature-verified, replay-protected, idempotent (§7.2, §10). Unhandled event types are acked 200 and ignored.

---

## 7. Database schema

Additive, idempotent migrations `supabase/migrations/2026MMDDHHMMSS_*.sql`, filenames `20260714*`. All follow the M5 conventions (`create ... if not exists`, guarded policies, `-- ROLLBACK:` block).

### 7.1 Enums

```sql
-- 20260714010000_m6_enums.sql
do $$ begin create type public.plan_tier as enum ('free','pro','business','enterprise'); exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_status as enum
  ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'); exception when duplicate_object then null; end $$;
-- Additive notification types (append to the M5 enum — new values only, never remove).
alter type public.notification_type add value if not exists 'trial_ending';
alter type public.notification_type add value if not exists 'payment_failed';
alter type public.notification_type add value if not exists 'subscription_renewed';
alter type public.notification_type add value if not exists 'invoice_available';
alter type public.notification_type add value if not exists 'plan_upgraded';
alter type public.notification_type add value if not exists 'plan_downgraded';
```
> `alter type ... add value` cannot run inside a txn block with other uses of the value; ship enum additions in their **own** migration ahead of anything referencing them.

### 7.2 `stripe_customers` & `subscription_events`

```sql
-- 20260714020000_stripe_customers.sql
create table if not exists public.stripe_customers (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
create policy "own customer read" on public.stripe_customers
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only (webhook / checkout fn).

-- Append-only webhook log = idempotency + replay protection + audit.
create table if not exists public.subscription_events (
  id            bigint generated always as identity primary key,
  stripe_event_id text not null unique,          -- replay guard
  type          text not null,
  user_id       uuid references auth.users(id) on delete set null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);
create index if not exists subscription_events_type_idx on public.subscription_events (type, received_at desc);
alter table public.subscription_events enable row level security;  -- no policies → service role only
```

### 7.3 `plan_entitlements` (config, seedable)

```sql
-- 20260714030000_plan_entitlements.sql
create table if not exists public.plan_entitlements (
  plan            public.plan_tier primary key,
  analyses_month  integer,           -- null = unlimited
  domains_active  integer,
  pdf_month       integer,
  history_days    integer,
  ai_level        text not null default 'fallback' check (ai_level in ('fallback','grounded')),
  monitoring      text not null default 'none' check (monitoring in ('none','weekly','daily')),
  competitors_per_domain integer not null default 0,
  support         text not null default 'community',
  pdf_watermark   boolean not null default true,
  seats           integer not null default 1,
  api_access      boolean not null default false,
  sso             boolean not null default false,
  stripe_price_ids jsonb not null default '{}'::jsonb,   -- {monthly, annual}
  updated_at      timestamptz not null default now()
);
insert into public.plan_entitlements
 (plan, analyses_month, domains_active, pdf_month, history_days, ai_level, monitoring, competitors_per_domain, support, pdf_watermark, seats, api_access, sso) values
 ('free',       5,   1,  1,   30,  'fallback','none', 0,  'community', true,  1, false, false),
 ('pro',        100, 10, 50,  365, 'grounded','weekly',3, 'email',     false, 1, false, false),
 ('business',   1000,50, null,null,'grounded','daily',10, 'priority',  false, 1, false, false),
 ('enterprise', null,null,null,null,'grounded','daily',null,'dedicated',false,1, true,  true)
on conflict (plan) do nothing;

alter table public.plan_entitlements enable row level security;
create policy "anyone reads plan limits" on public.plan_entitlements for select to anon, authenticated using (true);
-- writes: service role only.

-- Per-user overrides (Enterprise/custom). null column = fall back to plan default.
create table if not exists public.entitlement_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overrides jsonb not null default '{}'::jsonb,   -- partial map of the same keys
  note text, updated_at timestamptz not null default now()
);
alter table public.entitlement_overrides enable row level security;
create policy "own overrides read" on public.entitlement_overrides
  for select to authenticated using (auth.uid() = user_id);
```

### 7.4 `subscriptions`, `usage_counters`, `invoices`

```sql
-- 20260714040000_subscriptions.sql
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  plan                   public.plan_tier not null default 'free',
  status                 public.subscription_status not null default 'active',
  price_id               text,
  interval               text check (interval in ('month','year')),
  quantity               integer not null default 1,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_end              timestamptz,
  grace_until            timestamptz,               -- past_due grace window end
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_period_end_idx on public.subscriptions (current_period_end);
alter table public.subscriptions enable row level security;
create policy "own subscription read" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only (webhook).

create table if not exists public.usage_counters (
  user_id      uuid not null references auth.users(id) on delete cascade,
  metric       text not null,                -- 'analyses_month' | 'pdf_month'
  period_start date not null,                -- month/window start
  count        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, metric, period_start)
);
create index if not exists usage_counters_lookup on public.usage_counters (user_id, metric, period_start);
alter table public.usage_counters enable row level security;
create policy "own usage read" on public.usage_counters
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.

-- Atomic increment; returns the new count (service role only, like bump_rate_limit).
create or replace function public.bump_usage(p_user uuid, p_metric text, p_period date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.usage_counters(user_id, metric, period_start, count)
  values (p_user, p_metric, p_period, 1)
  on conflict (user_id, metric, period_start)
  do update set count = usage_counters.count + 1, updated_at = now()
  returning usage_counters.count into n;
  return n;
end $$;
revoke all on function public.bump_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.bump_usage(uuid, text, date) to service_role;

-- Minimal invoice mirror for the billing page.
create table if not exists public.invoices (
  id                 text primary key,        -- stripe invoice id
  user_id            uuid references auth.users(id) on delete cascade,
  number             text,
  status             text,
  amount_due         integer,                 -- minor units
  amount_paid        integer,
  currency           text,
  hosted_invoice_url text,
  invoice_pdf        text,
  period_start       timestamptz,
  created            timestamptz not null
);
create index if not exists invoices_user_idx on public.invoices (user_id, created desc);
alter table public.invoices enable row level security;
create policy "own invoices read" on public.invoices
  for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.
```

### 7.5 `profiles.plan` cache (additive column on M5 table)

```sql
-- 20260714050000_profiles_plan_cache.sql
alter table public.profiles add column if not exists plan public.plan_tier not null default 'free';
create index if not exists profiles_plan_idx on public.profiles (plan);
-- Maintained by stripe-webhook alongside subscriptions; advisory (authoritative = subscriptions).
```

### 7.6 Entitlement-aware domain limit (controlled evolution of the M5 trigger)

The M5 `enforce_domain_limit()` hardcodes 25. M6 replaces it (via `create or replace`, additive migration — the trigger binding is unchanged) so the cap comes from the user's entitlements.

```sql
-- 20260714060000_domain_limit_entitlement.sql
create or replace function public.enforce_domain_limit()
returns trigger language plpgsql set search_path = public as $$
declare cap integer; cnt integer; usr_plan public.plan_tier;
begin
  if new.is_archived then return new; end if;
  select plan into usr_plan from public.profiles where id = new.user_id;
  select domains_active into cap from public.plan_entitlements where plan = coalesce(usr_plan,'free');
  -- override?
  select coalesce((overrides->>'domains_active')::int, cap) into cap
    from public.entitlement_overrides where user_id = new.user_id;
  if cap is null then return new; end if;      -- unlimited
  select count(*) into cnt from public.domains where user_id = new.user_id and is_archived = false;
  if cnt >= cap then
    raise exception 'domain_limit_reached'
      using errcode='check_violation', hint = format('Din plan tillåter %s aktiva domäner.', cap);
  end if;
  return new;
end $$;
-- Trigger `domains_enforce_limit` from M5 is unchanged; it now enforces the plan cap.
```
> Safe because accounts shipped dark (0 real users at M6 start). If real Free users exist at rollout, grandfather them (see §14 rollback/verification).

### 7.7 Relationships

```
auth.users 1─1 stripe_customers 1─1 (Stripe Customer)
auth.users 1─1 subscriptions ──(price_id⇒plan)──> plan_entitlements
auth.users 1─* usage_counters,  1─* invoices,  1─0..1 entitlement_overrides
profiles.plan (cache)  ←maintained by→  stripe-webhook
subscription_events (append-only webhook log; idempotency)
```

### 7.8 Migration order & rollback
Order: enums → stripe_customers/events → plan_entitlements (+seed) → subscriptions/usage/invoices → profiles.plan → domain_limit_entitlement → RLS is inline per table → (webhook cron for reconciliation, §8.6). Each migration idempotent. **Rollback** (reverse order): restore the M5 `enforce_domain_limit` (25 constant) first, drop M6 tables/columns/functions; dropping the added enum values is **not** possible in Postgres — leave the extra `notification_type` values (harmless, unused). Feature-flag rollback is instant (§14).

---

## 8. Backend

### 8.1 Shared entitlements module — `_shared/entitlements.ts`
```
resolveEntitlements(svc, userId) -> {
  plan, status, limits:{analyses_month, domains_active, pdf_month, history_days,
    ai_level, monitoring, competitors_per_domain, pdf_watermark, ...}, inGrace:boolean }
```
Reads `subscriptions` (+ grace check via `grace_until`), `plan_entitlements`, `entitlement_overrides`; `past_due` within grace keeps the paid plan, otherwise falls to `free`. Pure of side-effects. `checkAndBumpUsage(svc, userId, metric, limit)` → `{allowed, count}` using `bump_usage` (checks before incrementing; never increments when blocked).

### 8.2 New Edge Functions
| Function | Auth | Purpose |
| --- | --- | --- |
| `create-checkout-session` | user JWT | Lazily ensure Stripe Customer → Checkout Session (§6.2) → URL. Rate-limited. |
| `create-portal-session` | user JWT | Billing Portal Session (§6.3) → URL. |
| `get-entitlements` | user JWT | Return resolved entitlements + current usage for the UI. (Or a DB view; function chosen for override/grace logic.) |
| `list-invoices` | user JWT | Return the user's mirrored `invoices` (or live Stripe fetch). |
| `stripe-webhook` | **no JWT**, signature-verified | Process §6.10 events → sync subscriptions/profiles.plan/invoices, emit notifications, reset usage on renewal. |
| `reconcile-subscriptions` | cron secret | Nightly drift check: re-pull active subs from Stripe, fix any missed webhook. |

### 8.3 Additive gating in frozen functions (authenticated path only)
Exactly the M5 additive discipline — the anonymous path is byte-identical.
- **`save-report`** (owned path): before insert, `checkAndBumpUsage(analyses_month, limit)`; if blocked → return `{error:'quota_exceeded', metric:'analyses_month'}` (402-style) and do **not** create the owned report. Anonymous path unchanged.
- **`analyze-website`** (summary phase): if the caller is an authenticated owner and `ai_level==='fallback'`, skip Gemini and use the deterministic insight (no new anonymous behavior; anonymous already uses whatever M3 does).
- **`render-pdf`**: check `pdf_month`; Free sets `watermark:true` template flag; over quota → `{error:'quota_exceeded', metric:'pdf_month'}`.
- **`rescan-domain`** / `domains_due_for_rescan`: cadence filtered by plan `monitoring` (none→never; weekly/daily interval).
- **`find-competitors`**: cap results to `competitors_per_domain`; 0 → `{error:'not_in_plan'}`.

### 8.4 Webhook processing (idempotent)
1. Read raw body + `stripe-signature`; `stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)` (throws on bad sig → 400).
2. `insert into subscription_events(stripe_event_id,…)`; unique violation → already processed → **200** (replay guard).
3. Switch on type → update `subscriptions` (+ derive `plan` from `price_id`), `profiles.plan`, `invoices`; on renewal (`invoice.paid` for a new period) reset `usage_counters` for the new `period_start`; emit the matching notification (§12).
4. `update subscription_events set processed_at=now()`. Always ack 200 unless signature/processing error (return 400/500 so Stripe retries).

### 8.5 Usage tracking & reset
Increment on the **gated action** (owned analysis, PDF). Reset by webhook on new billing period; Free users reset on calendar month (`period_start = date_trunc('month', now())`) computed at check time (a new month → new counter row, old ones age out; monthly rows pruned by the M5-style maintenance sweep, extended).

### 8.6 Secrets
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY/ANNUAL`, `STRIPE_PRICE_BUSINESS_MONTHLY/ANNUAL`, reuse `CRON_SECRET`. Publishable key (`VITE_STRIPE_PUBLISHABLE_KEY`) client-side only. **No Stripe secret ever reaches the client.**

---

## 9. Frontend

Behind `VITE_BILLING_ENABLED` (ships dark, like M5's accounts flag). Requires accounts enabled.

### 9.1 SaaS pricing/marketing page — `/plans`
New route (distinct from the frozen agency `/pricing`). Four-tier comparison, monthly/annual toggle, CTA → checkout (auth-gated: signed-out → `/login?next=/plans&intent=checkout:pro`). Reuses design tokens; `dataviz` not needed.

### 9.2 Billing page — `/app/billing`
Current plan + status badge (trial/active/past_due/canceled), renewal date, **usage meters** (analyses, PDFs, domains), **invoices** list (hosted links), buttons: **Upgrade**/**Change plan** (→ checkout or portal), **Manage billing** (→ portal), **Cancel** (portal, at period end).

### 9.3 Plan management / upgrade / downgrade
- **Upgrade:** `create-checkout-session(price)` → redirect to Stripe → return `/app/billing?status=success`; entitlements refresh (react-query invalidate `['entitlements']`) after webhook lands (poll/backoff or optimistic + reconcile).
- **Downgrade / cancel:** via Customer Portal (Stripe-hosted) → `cancel_at_period_end`; UI shows "Pro until <date>, then Free". Graceful — no data loss.

### 9.4 Invoices
Rendered from mirrored `invoices` (or `list-invoices`), each linking to Stripe hosted invoice + PDF.

### 9.5 Usage dashboard
Meters (used/limit) with color bands (`score-color` reuse) for each metric; "unlimited" when limit null; approaching-limit styling at ≥80%.

### 9.6 Subscription status surfaces
Global banner when `trialing` (days left), `past_due` (update payment CTA → portal), `canceled` (resubscribe CTA). Trial countdown in the top bar.

### 9.7 Upgrade prompts (contextual)
Triggered by `quota_exceeded`/`not_in_plan` responses and pre-emptive UI gates: adding a domain past cap, hitting analysis/PDF quota, toggling monitoring/competitors on Free/insufficient plan → a modal explaining the limit + "Uppgradera" CTA. One reusable `<UpgradeDialog metric=…/>`. Client gating is **UX only**; the server is authoritative.

### 9.8 Client entitlement hook
`useEntitlements()` (react-query `['entitlements', userId]` ← `get-entitlements`) drives gating/meters/banners. Never trusted for enforcement.

---

## 10. Security

| Threat | Mitigation |
| --- | --- |
| Forged webhook | `constructEvent` signature verify with `STRIPE_WEBHOOK_SECRET`; bad sig → 400, no processing. |
| Replay | `subscription_events.stripe_event_id` unique; duplicate → 200 no-op. |
| Client claims a plan | Entitlements resolved server-side from `subscriptions` mirror; client value never trusted for gating. |
| Quota bypass | Enforcement in Edge Functions (server), not the browser; `bump_usage` service-role only. |
| Checkout tampering / wrong customer | `client_reference_id`/`metadata.user_id` bound to the JWT user; webhook maps by customer→user; reject mismatches. |
| Stripe secret exposure | Secret key only in Edge secrets; only publishable key client-side. |
| Card testing / fraud | Stripe **Radar**; rate-limit `create-checkout-session` (reuse `rate_limits`, e.g. 10/h/user); require auth. |
| Portal/checkout abuse | Idempotency-Key; per-user rate limits; sessions scoped to the caller's customer. |
| Privilege via `profiles.plan` | It's an advisory cache; gates read `subscriptions`+entitlements, not the cache; column write is service-role only (M5 profiles update policy is `id=auth.uid()` for *own row* but `plan` is set by webhook — add a guard so clients can't self-set `plan`, §14 note). |
| Cross-tenant billing data | RLS: users read only own `subscriptions/usage/invoices/stripe_customers`; service role writes. |

**`profiles.plan` guard:** add a column-guard trigger (M5 pattern) so non-service_role updates cannot change `plan` (revert to `old.plan`).

---

## 11. Usage limits (enforcement summary)

| Metric | Enforced where | Behavior at limit |
| --- | --- | --- |
| Analyses/month | `save-report` owned path (`checkAndBumpUsage`) | Block owned save → upgrade prompt. Anonymous unaffected. |
| PDFs/month | `render-pdf` | Block render → prompt. |
| Domains (active) | `enforce_domain_limit` trigger (plan cap) | Insert rejected `domain_limit_reached` → prompt. |
| History retention | history/trend query window | Older-than-window hidden for Free (data retained). |
| AI level | `analyze-website` summary phase | Free = deterministic fallback (no Gemini). |
| Monitoring | `verify-domain` toggle + `domains_due_for_rescan` cadence | Free can't enable; cadence weekly/daily by plan. |
| Competitor tracking | `find-competitors` result cap | 0 → hidden; else capped list. |

All limits sourced from `resolveEntitlements`; **no magic numbers** in function bodies.

---

## 12. Notifications (extends M5)

New `notification_type` values (§7.1) emitted by `stripe-webhook`, respecting `user_settings` (add optional `notify_billing` toggle, default true):

| Event | Trigger |
| --- | --- |
| `trial_ending` | `customer.subscription.trial_will_end` |
| `payment_failed` | `invoice.payment_failed` |
| `subscription_renewed` | `invoice.paid` (new period) |
| `invoice_available` | `invoice.finalized` |
| `plan_upgraded` / `plan_downgraded` | `customer.subscription.updated` when plan rank changes |

Delivered in-app (M5 `NotificationsBell`) + optional email via the existing email path. Retention/prune reuse the M5 maintenance sweep.

---

## 13. Testing

- **Unit:** `resolveEntitlements` (each plan, grace, override, expired→free); usage window math; price_id→plan mapping; upgrade/downgrade rank; redirect-intent parsing.
- **Integration:** checkout→webhook→subscription row→entitlements; quota block on owned analysis/PDF; domain-cap trigger per plan; history window filter; Free forces deterministic AI.
- **Webhook:** signature valid/invalid (400); replay (duplicate event id → 200 no-op); each handled event mutates state correctly; unknown event → 200 ignored.
- **Stripe (test mode + Test Clocks):** trial→convert; trial→cancel; renewal resets usage; `payment_failed`→past_due→grace→downgrade; recovery restores; proration on upgrade; VAT/reverse-charge with/without VAT ID.
- **Security:** forged signature rejected; client cannot set `profiles.plan`; cross-user reads blocked (two-user matrix like M5 §5.9); quota bypass attempt via direct client insert denied; secret key never in bundle (grep build output).

### 13.1 Gates in CI
`tsc`, `eslint(src)`, `vitest`, `build+prerender`, the entitlement/webhook unit+integration suites, and the two-user billing RLS matrix all green.

---

## 14. Deployment

Order (mirrors M5's discipline; ships dark):
1. **Stripe setup:** create Products/Prices, configure Tax, Portal, Radar; register webhook endpoint → obtain `STRIPE_WEBHOOK_SECRET`.
2. **DB migrations** (`supabase db push`) in §7.8 order (enums own migration first).
3. **Secrets** (§8.6). **Seed** `plan_entitlements` (in migration) + set `stripe_price_ids`.
4. **Edge Functions deploy:** `stripe-webhook`, `create-checkout-session`, `create-portal-session`, `get-entitlements`, `list-invoices`, `reconcile-subscriptions`; **redeploy** `save-report`, `analyze-website`, `render-pdf`, `rescan-domain`, `find-competitors` with additive gating.
5. **Verify backend** with Stripe **test mode** end-to-end (checkout, webhook sync, quota enforcement, dunning via Test Clock) — two test users, RLS matrix, anonymous flow unchanged.
6. **Frontend** to Cloudflare with `VITE_BILLING_ENABLED=false` (dark) + `VITE_STRIPE_PUBLISHABLE_KEY`. Confirm public + M5 flows unchanged.
7. **Flip** `VITE_BILLING_ENABLED=true` after DoD; switch Stripe to **live** keys; smoke a real low-value transaction; refund.

**Grandfathering:** if real Free accounts exist at rollout with >Free domains, set an `entitlement_overrides` grace or raise Free `domains_active` temporarily; the domain trigger only blocks **new** inserts, never deletes existing rows.

**Rollback:** instant via `VITE_BILLING_ENABLED=false` (UI gone) + revert gated functions to the frozen versions (inert if unused). DB: restore M5 `enforce_domain_limit` (25) first, then drop M6 tables/columns/functions (reverse order); extra enum values remain (harmless). Stripe subscriptions are unaffected by DB rollback; reconcile on redeploy.

---

## 15. Definition of Done

**Compatibility**
1. Anonymous analyze → `/analys/:id` → PDF is byte-identical (regression test + live smoke). Agency `/pricing` unchanged. Git diff shows only additions + the two documented `create or replace` (domain trigger, gated-function paths).

**Billing core**
2. A user can subscribe to Pro/Business via Checkout, land back on `/app/billing`, and see the plan reflected within the webhook SLA; Customer Portal opens and can update card / cancel (at period end).
3. `stripe-webhook` verifies signatures, is idempotent (duplicate event → no double-effect), and keeps `subscriptions`/`profiles.plan`/`invoices` in sync for every handled event (test-clock covered).

**Entitlements & limits (hard gate)**
4. Every limit in §4 is enforced **server-side** and sourced from `plan_entitlements`: over-quota owned analysis/PDF blocked (402-style), domain cap per plan, Free forced to deterministic AI, monitoring cadence per plan, competitor cap per plan, history window per plan. Client cannot alter its plan or bypass a quota.
5. Trials convert/cancel correctly; `payment_failed` → grace → downgrade to Free (data retained) → recovery restores — all verified via Stripe Test Clocks.

**Security & isolation**
6. Two-user billing RLS matrix passes (no cross-tenant read of subscriptions/usage/invoices/customers); `profiles.plan` not client-writable; Stripe secret absent from the client bundle; checkout/portal rate-limited; forged/replayed webhooks rejected/no-op.

**Tax/VAT & invoices**
7. Stripe Tax applies 25% VAT (B2C) and reverse charge (valid EU VAT ID); invoices appear on `/app/billing` with working hosted/PDF links.

**UX**
8. Pricing `/plans`, billing page, usage meters, subscription-status banners, contextual upgrade prompts, and downgrade flow all function; empty/loading/error states present.

**Quality**
9. `tsc`, `eslint(src)`, `vitest`, `build+prerender`, entitlement/webhook suites, and the billing RLS matrix are all green in CI. Feature flag fully hides billing when off.

---

## Appendix A — New files (implementation map)

```
Migrations  supabase/migrations/20260714{01..06}0000_*.sql  (enums, stripe_customers+events,
                                                             plan_entitlements+overrides, subscriptions+
                                                             usage+invoices, profiles.plan, domain-limit)
Functions   supabase/functions/stripe-webhook/index.ts
            supabase/functions/create-checkout-session/index.ts
            supabase/functions/create-portal-session/index.ts
            supabase/functions/get-entitlements/index.ts
            supabase/functions/list-invoices/index.ts
            supabase/functions/reconcile-subscriptions/index.ts
            supabase/functions/_shared/entitlements.ts  stripe.ts
            (additive edits) save-report, analyze-website, render-pdf, rescan-domain, find-competitors
Frontend    src/lib/billing/{billing-service,entitlements-service,plans}.ts
            src/hooks/useEntitlements.ts
            src/pages/Plans.tsx                      (public /plans)
            src/pages/app/BillingPage.tsx            (/app/billing)
            src/components/app/{UsageMeter,UpgradeDialog,PlanBadge,SubscriptionBanner,InvoiceList}.tsx
            src/lib/account/limits.ts                (billingEnabled(); plan-aware helpers)
Routing     src/App.tsx  (+ /plans, /app/billing above catch-all — additive)
Config      .env  (VITE_BILLING_ENABLED, VITE_STRIPE_PUBLISHABLE_KEY)
```

## Appendix B — Explicit non-changes (frozen)

Analysis/scoring/AI/PDF engines; the agency `/pricing` page and `pricing.ts`; M2 reports public-read policy; M5 accounts schema/RLS (except the two documented additive `create or replace`); the anonymous public analysis→report→PDF flow. M6 adds around them; it does not repurpose them.
```
