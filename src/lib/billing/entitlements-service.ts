import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "./plans";

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
  plan: PlanId;
  status: string;
  inGrace: boolean;
  limits: Limits;
  usage: { analyses_month: number; pdf_month: number; domains_active: number };
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_end: string | null;
    interval: string | null;
  } | null;
}

/** Resolved plan/limits/usage for the UI. Enforcement is server-side; this is display only. */
export async function getEntitlements(): Promise<Entitlements | null> {
  try {
    const { data, error } = await supabase.functions.invoke("get-entitlements", { body: {} });
    if (error || data?.error) return null;
    return data as Entitlements;
  } catch {
    return null;
  }
}

// Re-exported from the pure (testable) helpers module.
export { retentionSince } from "./billing-utils";
