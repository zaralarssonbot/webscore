import { supabase } from "@/integrations/supabase/client";
import { validateDomain } from "@/lib/domain";
import type { Domain, VerificationMethod } from "./types";

// The account tables are not in the generated Database type (same convention as
// `reports`), so we cast the loosely-typed query results to our domain models.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listDomains(includeArchived = false): Promise<Domain[]> {
  const base = db.from("domains").select("*");
  const filtered = includeArchived ? base : base.eq("is_archived", false);
  const { data, error } = await filtered
    .order("is_primary", { ascending: false })
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[domain-service] listDomains:", error);
    return [];
  }
  return (data ?? []) as Domain[];
}

export async function getDomain(id: string): Promise<Domain | null> {
  const { data, error } = await db.from("domains").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[domain-service] getDomain:", error);
    return null;
  }
  return (data as Domain) ?? null;
}

export async function addDomain(
  userId: string,
  input: string,
): Promise<{ domain?: Domain; error?: string; limitReached?: boolean }> {
  const v = validateDomain(input);
  if (!v.valid || !v.normalized) return { error: v.error ?? "Ogiltig domän." };
  const { data, error } = await db
    .from("domains")
    .insert({ user_id: userId, normalized_domain: v.normalized, display_name: v.normalized })
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { error: "Domänen finns redan i ditt konto." };
    // The DB trigger enforces the plan cap (Free 3 / Pro 10 / Business 50 / ∞).
    if (/domain_limit_reached/i.test(error.message ?? "") || /domain_limit_reached/i.test(error.hint ?? "")) {
      return { error: error.hint || "Du har nått din gräns för antal domäner.", limitReached: true };
    }
    console.error("[domain-service] addDomain:", error);
    return { error: "Kunde inte lägga till domänen." };
  }
  return { domain: data as Domain };
}

/** Update user-editable fields only (server-owned columns are reverted by a DB trigger). */
export async function updateDomain(
  id: string,
  patch: Partial<Pick<Domain, "display_name" | "is_favorite" | "is_archived">>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.from("domains").update(patch).eq("id", id);
  if (error) {
    console.error("[domain-service] updateDomain:", error);
    return { ok: false, error: "Kunde inte uppdatera domänen." };
  }
  return { ok: true };
}

export async function removeDomain(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.from("domains").delete().eq("id", id);
  if (error) {
    console.error("[domain-service] removeDomain:", error);
    return { ok: false, error: "Kunde inte ta bort domänen." };
  }
  return { ok: true };
}

export async function setPrimaryDomain(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.rpc("set_primary_domain", { p_domain_id: id });
  if (error) {
    console.error("[domain-service] setPrimaryDomain:", error);
    return { ok: false, error: "Kunde inte ange primär domän." };
  }
  return { ok: true };
}

export interface VerificationInstructions {
  record?: string;
  type?: string;
  value?: string;
  tag?: string;
  place?: string;
  path?: string;
  content?: string;
}

export interface VerifyResult {
  ok: boolean;
  verified?: boolean;
  token?: string;
  method?: VerificationMethod;
  instructions?: VerificationInstructions;
  error?: string;
}

/** Request the token/instructions (check=false) or run the check (check=true). */
export async function verifyDomain(
  domainId: string,
  method: VerificationMethod,
  check: boolean,
): Promise<VerifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-domain", {
      body: { domainId, method, check },
    });
    if (error) return { ok: false, error: error.message };
    return data as VerifyResult;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

export async function setMonitoring(
  domainId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-domain", {
      body: { domainId, setMonitoring: enabled },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error as string };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
