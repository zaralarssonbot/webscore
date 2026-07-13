// Pure, unit-tested billing helpers (no I/O, no supabase import) so they can be
// tested directly. See M6_SPEC.md §13.

import type { PlanDef, PlanId } from "./plans";
import { PLAN_RANK } from "./plans";

/** ISO lower bound for history/trend visibility given retention (null = unlimited). */
export function retentionSince(historyDays: number | null | undefined, nowMs = Date.now()): string | null {
  if (historyDays == null) return null;
  return new Date(nowMs - historyDays * 86_400_000).toISOString();
}

/** Display price for a plan card at a billing interval. */
export function formatPrice(p: PlanDef, interval: "month" | "year"): { big: string; sub: string } {
  if (p.monthly === null) return { big: "Offert", sub: "kontakta oss" };
  if (p.monthly === 0) return { big: "0 kr", sub: "för alltid" };
  if (interval === "year" && p.annual) return { big: `${Math.round(p.annual / 12)} kr`, sub: "/mån · faktureras årsvis" };
  return { big: `${p.monthly} kr`, sub: "/mån · exkl. moms" };
}

/** >0 if `to` is an upgrade from `from`, <0 downgrade, 0 same. */
export function planRankDelta(from: PlanId, to: PlanId): number {
  return PLAN_RANK[to] - PLAN_RANK[from];
}

/** Whether a usage value is at/over its limit (null limit = unlimited → never over). */
export function isOverLimit(used: number, limit: number | null): boolean {
  return limit != null && used >= limit;
}
