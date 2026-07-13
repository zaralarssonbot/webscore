// M6 shared entitlement resolution + usage metering. The SINGLE server-side
// decision function every gate consults. Client plan is never trusted.
// See M6_SPEC.md §5, §8.1.

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Plan = "free" | "pro" | "business" | "enterprise";

export interface Limits {
  analyses_month: number | null;
  domains_active: number | null;
  pdf_month: number | null;
  history_days: number | null;
  ai_level: "fallback" | "grounded";
  monitoring: "none" | "weekly" | "daily";
  competitors_per_domain: number | null;
  pdf_watermark: boolean;
  support: string;
  seats: number;
  api_access: boolean;
  sso: boolean;
}

export interface Entitlements {
  plan: Plan;
  status: string;
  inGrace: boolean;
  limits: Limits;
}

// Mirrors the plan_entitlements seed for the free tier — the safe fallback if a
// read fails (Free domains_active = 3, the approved product value).
export const FREE_LIMITS: Limits = {
  analyses_month: 5,
  domains_active: 3,
  pdf_month: 1,
  history_days: 30,
  ai_level: "fallback",
  monitoring: "none",
  competitors_per_domain: 0,
  pdf_watermark: true,
  support: "community",
  seats: 1,
  api_access: false,
  sso: false,
};

const ACTIVE = new Set(["active", "trialing"]);

/** Resolve a user's effective plan + limits (subscription → plan_entitlements → overrides). */
export async function resolveEntitlements(svc: SupabaseClient, userId: string): Promise<Entitlements> {
  let plan: Plan = "free";
  let status = "active";
  let inGrace = false;

  try {
    const { data: sub } = await svc.from("subscriptions").select("plan,status,grace_until").eq("user_id", userId).maybeSingle();
    if (sub) {
      status = sub.status as string;
      const active = ACTIVE.has(sub.status as string);
      const grace = sub.status === "past_due" && sub.grace_until && new Date(sub.grace_until as string) > new Date();
      inGrace = !!grace;
      plan = active || grace ? (sub.plan as Plan) : "free";
    }
  } catch { /* fall through to free */ }

  let limits: Limits = { ...FREE_LIMITS };
  try {
    const { data: pe } = await svc.from("plan_entitlements").select("*").eq("plan", plan).maybeSingle();
    if (pe) {
      limits = {
        analyses_month: pe.analyses_month, domains_active: pe.domains_active, pdf_month: pe.pdf_month,
        history_days: pe.history_days, ai_level: pe.ai_level, monitoring: pe.monitoring,
        competitors_per_domain: pe.competitors_per_domain, pdf_watermark: pe.pdf_watermark,
        support: pe.support, seats: pe.seats, api_access: pe.api_access, sso: pe.sso,
      };
    }
    const { data: ov } = await svc.from("entitlement_overrides").select("overrides").eq("user_id", userId).maybeSingle();
    if (ov?.overrides && typeof ov.overrides === "object") limits = { ...limits, ...ov.overrides };
  } catch { /* keep FREE_LIMITS */ }

  return { plan, status, inGrace, limits };
}

/** Current UTC month window start as a `YYYY-MM-01` date string. */
export function monthPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Read the current usage count for a metric in this month's window. */
export async function usageCount(svc: SupabaseClient, userId: string, metric: string): Promise<number> {
  try {
    const { data } = await svc.from("usage_counters").select("count")
      .eq("user_id", userId).eq("metric", metric).eq("period_start", monthPeriod()).maybeSingle();
    return (data?.count as number) ?? 0;
  } catch { return 0; }
}

/**
 * Check a metric against its limit and, if allowed, atomically increment usage.
 * limit === null → unlimited. Returns allowed=false WITHOUT incrementing when at
 * or over the cap. Fails open on infra error (never blocks a legit user on a DB hiccup).
 */
export async function checkAndBumpUsage(
  svc: SupabaseClient, userId: string, metric: string, limit: number | null,
): Promise<{ allowed: boolean; count: number; limit: number | null }> {
  if (limit === null) {
    // unlimited: still track for display, best-effort
    try { const { data } = await svc.rpc("bump_usage", { p_user: userId, p_metric: metric, p_period: monthPeriod() }); return { allowed: true, count: (data as number) ?? 0, limit: null }; }
    catch { return { allowed: true, count: 0, limit: null }; }
  }
  try {
    const current = await usageCount(svc, userId, metric);
    if (current >= limit) return { allowed: false, count: current, limit };
    const { data, error } = await svc.rpc("bump_usage", { p_user: userId, p_metric: metric, p_period: monthPeriod() });
    if (error) return { allowed: true, count: current + 1, limit }; // fail open
    return { allowed: true, count: (data as number) ?? current + 1, limit };
  } catch {
    return { allowed: true, count: 0, limit }; // fail open
  }
}
