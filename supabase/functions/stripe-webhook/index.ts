// M6 — stripe-webhook. NO JWT (Stripe calls it); authenticated by signature.
// Idempotent + replay-protected via subscription_events.stripe_event_id unique.
// Syncs subscriptions/profiles.plan/invoices and emits billing notifications.
// See M6_SPEC.md §6.10, §8.4, §10.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serviceClient } from "../_shared/auth.ts";
import { stripeClient, planForPriceId, userForCustomer, PLAN_RANK } from "../_shared/stripe.ts";
import type { Plan } from "../_shared/entitlements.ts";
// deno-lint-ignore no-explicit-any
type Any = any;

const GRACE_DAYS = 7;
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

async function notifyBilling(svc: Any, userId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  try { await svc.from("notifications").insert({ user_id: userId, type, title, body, data }); }
  catch (e) { console.error("[webhook] notify failed:", e); }
}

/** Upsert the subscriptions mirror + profiles.plan cache; emit plan-change notifications. */
async function syncSubscription(svc: Any, userId: string, sub: Any) {
  const priceId: string | null = sub?.items?.data?.[0]?.price?.id ?? null;
  const mapped = priceId ? await planForPriceId(svc, priceId) : null;
  const status: string = sub.status;
  const active = status === "active" || status === "trialing";
  const pastDue = status === "past_due";
  const tier: Plan = mapped?.plan ?? "free";
  const effective: Plan = active || pastDue ? tier : "free"; // grace handled at read via grace_until
  const graceUntil = pastDue ? new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString() : null;

  const { data: prev } = await svc.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
  const prevPlan: Plan = (prev?.plan as Plan) ?? "free";

  await svc.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    plan: tier,
    status,
    price_id: priceId,
    interval: mapped?.interval ?? null,
    quantity: sub?.items?.data?.[0]?.quantity ?? 1,
    current_period_start: iso(sub.current_period_start),
    current_period_end: iso(sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    trial_end: iso(sub.trial_end),
    grace_until: graceUntil,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  await svc.from("profiles").update({ plan: effective }).eq("id", userId);

  if (PLAN_RANK[effective] > PLAN_RANK[prevPlan]) {
    await notifyBilling(svc, userId, "plan_upgraded", "Din plan är uppgraderad", `Du är nu på ${effective.toUpperCase()}.`, { plan: effective });
  } else if (PLAN_RANK[effective] < PLAN_RANK[prevPlan]) {
    await notifyBilling(svc, userId, "plan_downgraded", "Din plan har ändrats", `Du är nu på ${effective.toUpperCase()}.`, { plan: effective });
  }
}

async function upsertInvoice(svc: Any, userId: string | null, inv: Any) {
  await svc.from("invoices").upsert({
    id: inv.id,
    user_id: userId,
    number: inv.number ?? null,
    status: inv.status ?? null,
    amount_due: inv.amount_due ?? null,
    amount_paid: inv.amount_paid ?? null,
    currency: inv.currency ?? null,
    hosted_invoice_url: inv.hosted_invoice_url ?? null,
    invoice_pdf: inv.invoice_pdf ?? null,
    period_start: iso(inv.period_start),
    created: iso(inv.created) ?? new Date().toISOString(),
  }, { onConflict: "id" });
}

async function handleEvent(stripe: Any, svc: Any, event: Any) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const uid = obj.client_reference_id ?? (obj.customer ? await userForCustomer(svc, obj.customer) : null);
      if (uid && obj.subscription) {
        const sub = await stripe.subscriptions.retrieve(obj.subscription);
        await syncSubscription(svc, uid, sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const uid = await userForCustomer(svc, typeof obj.customer === "string" ? obj.customer : obj.customer?.id);
      if (uid) await syncSubscription(svc, uid, obj);
      break;
    }
    case "customer.subscription.deleted": {
      const uid = await userForCustomer(svc, typeof obj.customer === "string" ? obj.customer : obj.customer?.id);
      if (uid) {
        await svc.from("subscriptions").update({ plan: "free", status: "canceled", grace_until: null, updated_at: new Date().toISOString() }).eq("user_id", uid);
        await svc.from("profiles").update({ plan: "free" }).eq("id", uid);
        await notifyBilling(svc, uid, "plan_downgraded", "Din prenumeration avslutades", "Du är nu på FREE.", {});
      }
      break;
    }
    case "customer.subscription.trial_will_end": {
      const uid = await userForCustomer(svc, typeof obj.customer === "string" ? obj.customer : obj.customer?.id);
      if (uid) await notifyBilling(svc, uid, "trial_ending", "Din provperiod tar snart slut", "Lägg till en betalmetod för att fortsätta.", { trial_end: iso(obj.trial_end) });
      break;
    }
    case "invoice.paid": {
      const uid = await userForCustomer(svc, obj.customer);
      if (uid) {
        await upsertInvoice(svc, uid, obj);
        if (obj.billing_reason === "subscription_cycle") {
          await notifyBilling(svc, uid, "subscription_renewed", "Prenumerationen förnyad", "Tack! Din plan är förnyad.", { invoice: obj.id });
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const uid = await userForCustomer(svc, obj.customer);
      if (uid) {
        await svc.from("subscriptions").update({
          status: "past_due",
          grace_until: new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", uid);
        await notifyBilling(svc, uid, "payment_failed", "Betalningen misslyckades", "Uppdatera din betalmetod för att undvika avbrott.", { invoice: obj.id });
      }
      break;
    }
    case "invoice.finalized": {
      const uid = await userForCustomer(svc, obj.customer);
      if (uid) {
        await upsertInvoice(svc, uid, obj);
        await notifyBilling(svc, uid, "invoice_available", "Ny faktura tillgänglig", "En ny faktura finns i din fakturering.", { invoice: obj.id });
      }
      break;
    }
    default:
      // Unhandled event types are acknowledged and ignored.
      break;
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text(); // RAW body required for signature verification
  if (!sig || !secret) return new Response("missing signature", { status: 400 });

  const stripe = stripeClient();
  let event: Any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    console.error("[webhook] signature verification failed:", e instanceof Error ? e.message : e);
    return new Response("bad signature", { status: 400 });
  }

  const svc = serviceClient();

  // Idempotency / replay guard: first insert wins; duplicates are no-ops.
  const ins = await svc.from("subscription_events")
    .insert({ stripe_event_id: event.id, type: event.type, payload: event }).select("id").maybeSingle();
  if (ins.error) {
    if (ins.error.code === "23505") return new Response("ok (duplicate)", { status: 200 });
    console.error("[webhook] event log insert failed:", ins.error);
    return new Response("log error", { status: 500 }); // Stripe retries
  }

  try {
    await handleEvent(stripe, svc, event);
    await svc.from("subscription_events").update({ processed_at: new Date().toISOString() }).eq("stripe_event_id", event.id);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[webhook] handler error:", e);
    return new Response("handler error", { status: 500 }); // Stripe retries
  }
});
