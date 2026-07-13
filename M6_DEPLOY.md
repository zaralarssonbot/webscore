# M6 Deployment Runbook

M6 is **code-complete and gate-passing** (tsc · 98 tests · build+prerender · additive-only).
It ships **dark**: until `VITE_BILLING_ENABLED=true` in Cloudflare, no billing UI shows and no
subscription can be created. The DB/function layer can be deployed and verified **without Stripe**
(functions are inert until their secrets + the flag are set).

## What can be deployed now (no Stripe needed)
1. **DB migrations** (`supabase db push`) — 7 additive migrations `20260714*`. Idempotent.
   Verify: `plan_entitlements` seeded (Free `domains_active=3`), `subscriptions/usage_counters/
   invoices/stripe_customers/subscription_events` exist, RLS own-read/service-write, domain cap now
   plan-driven, `profiles.plan` present + guard trigger.
2. **Edge Functions** — deploy `stripe-webhook`, `create-checkout-session`, `create-portal-session`,
   `get-entitlements`, `reconcile-subscriptions`; **redeploy** the additively-gated
   `save-report`, `analyze-website`, `render-pdf`, `verify-domain`, `find-competitors`,
   `rescan-domain`. (They fail-safe to FREE limits until `plan_entitlements` exists.)
3. **Frontend** to Cloudflare with `VITE_BILLING_ENABLED` unset → billing hidden; public + M5
   flows unchanged.
4. **Regression gate:** anonymous analyze → `/analys/:id` → PDF byte-identical; Free authenticated
   flows gated (quota 402, domain cap 3, deterministic AI, no monitoring).

## What requires YOU (Stripe + config) before enabling
5. **Stripe account setup:** create Products + recurring Prices (pro/business monthly+annual, SEK),
   enable Stripe Tax + Customer Portal + Radar, register the webhook endpoint
   (`https://<ref>.functions.supabase.co/stripe-webhook`) → obtain `STRIPE_WEBHOOK_SECRET`.
6. **Function secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY/
   ANNUAL`, `STRIPE_PRICE_BUSINESS_MONTHLY/ANNUAL`, `APP_URL=https://webscore.se`
   (`supabase secrets set …`). Also write `plan_entitlements.stripe_price_ids` per plan.
7. **Test-mode verification (Stripe Test Clocks):** checkout → webhook sync → entitlement change;
   trial convert/cancel; `payment_failed` → grace → downgrade → recovery; proration; VAT + reverse
   charge. Two test users → billing RLS matrix.
8. **Enable:** set `VITE_BILLING_ENABLED=true` in Cloudflare + redeploy; switch Stripe to **live**
   keys; smoke a real low-value purchase; refund.
9. **Cron:** schedule `reconcile-subscriptions` nightly (header `x-webscore-cron: $CRON_SECRET`).

## Rollback
- Instant: `VITE_BILLING_ENABLED=false` + redeploy (UI gone).
- Functions: revert the gated functions to their M5 versions (inert if unused).
- DB: restore the M5 `enforce_domain_limit` (25) + M5 `domains_due_for_rescan`, then drop M6
  tables/columns/functions (reverse order). Added enum values remain (harmless).
