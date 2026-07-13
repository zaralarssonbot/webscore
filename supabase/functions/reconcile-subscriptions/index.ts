// M6 — reconcile-subscriptions. Internal (cron secret). Nightly drift fix:
// re-pull each live subscription from Stripe and correct any state a missed
// webhook left stale. Minimal sync (status/plan/period), no notifications. §8.2.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient } from "../_shared/auth.ts";
import { stripeClient, planForPriceId } from "../_shared/stripe.ts";
import type { Plan } from "../_shared/entitlements.ts";

const GRACE_DAYS = 7;
const iso = (u: number | null | undefined) => (u ? new Date(u * 1000).toISOString() : null);

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret || req.headers.get("x-webscore-cron") !== secret) return json({ error: "forbidden" }, 403);

    const svc = serviceClient();
    const stripe = stripeClient();

    const { data: rows } = await svc.from("subscriptions")
      .select("user_id, stripe_subscription_id")
      .not("stripe_subscription_id", "is", null)
      .in("status", ["trialing", "active", "past_due", "unpaid", "incomplete"]);

    let fixed = 0;
    for (const row of rows ?? []) {
      try {
        // deno-lint-ignore no-explicit-any
        const sub: any = await stripe.subscriptions.retrieve(row.stripe_subscription_id as string);
        const priceId: string | null = sub?.items?.data?.[0]?.price?.id ?? null;
        const mapped = priceId ? await planForPriceId(svc, priceId) : null;
        const status: string = sub.status;
        const active = status === "active" || status === "trialing";
        const pastDue = status === "past_due";
        const tier: Plan = mapped?.plan ?? "free";
        const effective: Plan = active || pastDue ? tier : "free";

        await svc.from("subscriptions").update({
          plan: tier, status, price_id: priceId, interval: mapped?.interval ?? null,
          current_period_start: iso(sub.current_period_start),
          current_period_end: iso(sub.current_period_end),
          cancel_at_period_end: !!sub.cancel_at_period_end,
          trial_end: iso(sub.trial_end),
          grace_until: pastDue ? new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", row.user_id);
        await svc.from("profiles").update({ plan: effective }).eq("id", row.user_id);
        fixed++;
      } catch (e) {
        console.error("[reconcile] sub", row.stripe_subscription_id, e instanceof Error ? e.message : e);
      }
    }
    return json({ ok: true, reconciled: fixed, total: (rows ?? []).length });
  } catch (e) {
    console.error("reconcile-subscriptions error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
