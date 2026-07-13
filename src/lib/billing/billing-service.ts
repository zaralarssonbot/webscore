import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "./plans";

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  currency: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: string;
}

/** Start Stripe Checkout for a plan/interval; returns the hosted URL to redirect to. */
export async function startCheckout(
  plan: PlanId,
  interval: "month" | "year",
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { plan, interval, returnUrl: window.location.origin },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error as string };
    return { url: data?.url as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

/** Open the Stripe Customer Portal; returns the hosted URL. */
export async function openPortal(): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: { returnUrl: window.location.origin },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error as string };
    return { url: data?.url as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

/** Read the caller's invoices (own-read RLS). */
export async function listInvoices(): Promise<Invoice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data, error } = await db
    .from("invoices")
    .select("id, number, status, amount_due, amount_paid, currency, hosted_invoice_url, invoice_pdf, created")
    .order("created", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[billing] listInvoices:", error);
    return [];
  }
  return (data ?? []) as Invoice[];
}
