// M6 shared Stripe helpers. The secret key lives ONLY here (Edge secrets), never
// client-side. Uses the fetch-based HTTP client + async crypto so signature
// verification works on Deno/edge. See M6_SPEC.md §6, §8, §10.

import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Plan } from "./entitlements.ts";

export function stripeClient(): Stripe {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Map a plan+interval to the configured Stripe price id (from function secrets). */
export function priceIdFor(plan: Plan, interval: "month" | "year"): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === "year" ? "ANNUAL" : "MONTHLY"}`;
  return Deno.env.get(key) ?? null;
}

/** Resolve a Stripe price id back to a plan tier (env first, then plan_entitlements). */
export async function planForPriceId(svc: SupabaseClient, priceId: string): Promise<{ plan: Plan; interval: "month" | "year" } | null> {
  for (const plan of ["pro", "business", "enterprise"] as Plan[]) {
    if (priceIdFor(plan, "month") === priceId) return { plan, interval: "month" };
    if (priceIdFor(plan, "year") === priceId) return { plan, interval: "year" };
  }
  try {
    const { data } = await svc.from("plan_entitlements").select("plan,stripe_price_ids");
    for (const row of data ?? []) {
      const ids = (row.stripe_price_ids ?? {}) as Record<string, string>;
      if (ids.monthly === priceId) return { plan: row.plan as Plan, interval: "month" };
      if (ids.annual === priceId) return { plan: row.plan as Plan, interval: "year" };
    }
  } catch { /* ignore */ }
  return null;
}

/** Ensure a Stripe Customer exists for this user; returns the customer id. */
export async function ensureCustomer(
  stripe: Stripe, svc: SupabaseClient, userId: string, email: string | null,
): Promise<string> {
  const { data: existing } = await svc.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  await svc.from("stripe_customers").insert({ user_id: userId, stripe_customer_id: customer.id });
  return customer.id;
}

/** Reverse-map a Stripe customer id to our user id. */
export async function userForCustomer(svc: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await svc.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return (data?.user_id as string) ?? null;
}

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, business: 2, enterprise: 3 };
