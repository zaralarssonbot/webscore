import { supabase } from "@/integrations/supabase/client";

/**
 * Claim an anonymous report into the signed-in user's account. Idempotent.
 * Returns ok:false (never throws) so the caller can degrade gracefully.
 */
export async function claimReport(
  reportId: string,
): Promise<{ ok: boolean; domainId?: string | null; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("claim-report", { body: { reportId } });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error as string };
    return { ok: true, domainId: (data?.domainId as string | null) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
