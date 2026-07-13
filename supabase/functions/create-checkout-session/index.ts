// M6 — create-checkout-session. Auth required. Creates a Stripe Checkout Session
// for a plan/interval, bound to the JWT user (client_reference_id). Trial applied
// only on the user's first paid subscription. See M6_SPEC.md §6.2.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId, rateLimit } from "../_shared/auth.ts";
import { stripeClient, priceIdFor, ensureCustomer } from "../_shared/stripe.ts";
import type { Plan } from "../_shared/entitlements.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { plan, interval, returnUrl } = (await req.json()) as
      { plan?: Plan; interval?: "month" | "year"; returnUrl?: string };
    if (!plan || !["pro", "business", "enterprise"].includes(plan) || !["month", "year"].includes(interval ?? "")) {
      return json({ error: "plan and interval are required" }, 400);
    }
    const price = priceIdFor(plan, interval as "month" | "year");
    if (!price) return json({ error: "price_not_configured" }, 400);

    const svc = serviceClient();
    if (!(await rateLimit(svc, `user:${uid}`, "checkout", 10, 3_600_000))) {
      return json({ error: "rate_limited" }, 429);
    }

    const stripe = stripeClient();
    const email = (await svc.auth.admin.getUserById(uid)).data.user?.email ?? null;
    const customer = await ensureCustomer(stripe, svc, uid, email);

    const { data: sub } = await svc.from("subscriptions").select("stripe_subscription_id").eq("user_id", uid).maybeSingle();
    const firstTime = !sub?.stripe_subscription_id;

    const appUrl = (returnUrl && returnUrl.startsWith("https://") ? returnUrl : null)
      ?? Deno.env.get("APP_URL") ?? "https://webscore.se";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer,
      client_reference_id: uid,
      subscription_data: firstTime ? { trial_period_days: 14 } : undefined,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      success_url: `${appUrl}/app/billing?status=success`,
      cancel_url: `${appUrl}/app/billing?status=cancelled`,
    }, { idempotencyKey: `co_${uid}_${plan}_${interval}_${Date.now()}` });

    return json({ url: session.url });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
