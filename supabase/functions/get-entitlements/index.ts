// M6 — get-entitlements. Auth required. Returns the caller's resolved plan,
// limits, current usage, and subscription status for the billing/usage UI.
// This is display data; enforcement happens server-side at each gate. §8.2, §9.8.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId } from "../_shared/auth.ts";
import { resolveEntitlements, usageCount } from "../_shared/entitlements.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const svc = serviceClient();
    const ent = await resolveEntitlements(svc, uid);

    const [analyses, pdfs, domainsRes, subRes] = await Promise.all([
      usageCount(svc, uid, "analyses_month"),
      usageCount(svc, uid, "pdf_month"),
      svc.from("domains").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("is_archived", false),
      svc.from("subscriptions").select("status,current_period_end,cancel_at_period_end,trial_end,interval").eq("user_id", uid).maybeSingle(),
    ]);

    return json({
      plan: ent.plan,
      status: ent.status,
      inGrace: ent.inGrace,
      limits: ent.limits,
      usage: {
        analyses_month: analyses,
        pdf_month: pdfs,
        domains_active: domainsRes.count ?? 0,
      },
      subscription: subRes.data ?? null,
    });
  } catch (e) {
    console.error("get-entitlements error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
