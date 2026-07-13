// M6 — create-portal-session. Auth required. Opens the Stripe Billing Portal for
// the caller's customer (update card, cancel, switch plan, invoices). §6.3.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId, rateLimit } from "../_shared/auth.ts";
import { stripeClient } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { returnUrl } = (await req.json().catch(() => ({}))) as { returnUrl?: string };
    const svc = serviceClient();
    if (!(await rateLimit(svc, `user:${uid}`, "portal", 20, 3_600_000))) {
      return json({ error: "rate_limited" }, 429);
    }

    const { data: cust } = await svc.from("stripe_customers").select("stripe_customer_id").eq("user_id", uid).maybeSingle();
    if (!cust?.stripe_customer_id) return json({ error: "no_customer" }, 400);

    const appUrl = (returnUrl && returnUrl.startsWith("https://") ? returnUrl : null)
      ?? Deno.env.get("APP_URL") ?? "https://webscore.se";
    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: cust.stripe_customer_id as string,
      return_url: `${appUrl}/app/billing`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("create-portal-session error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
