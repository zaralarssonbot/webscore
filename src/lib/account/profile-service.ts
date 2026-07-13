import { supabase } from "@/integrations/supabase/client";
import type { Profile, UserSettings } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("[profile-service] getProfile:", error);
    return null;
  }
  return (data as Profile) ?? null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "company_name" | "company_org_number" | "locale" | "avatar_url" | "marketing_opt_in" | "onboarded_at">>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) {
    console.error("[profile-service] updateProfile:", error);
    return { ok: false, error: "Kunde inte spara profilen." };
  }
  return { ok: true };
}

export async function getSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await db.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[profile-service] getSettings:", error);
    return null;
  }
  return (data as UserSettings) ?? null;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Omit<UserSettings, "user_id">>,
): Promise<{ ok: boolean; error?: string }> {
  // Upsert so a missing row (should not happen — trigger seeds it) still works.
  const { error } = await db
    .from("user_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) {
    console.error("[profile-service] updateSettings:", error);
    return { ok: false, error: "Kunde inte spara inställningarna." };
  }
  return { ok: true };
}

/** GDPR export — fetches the bundle and triggers a browser download. */
export async function exportAccountData(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("export-account-data", { body: {} });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error as string };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webscore-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

export async function deleteAccount(mode: "anonymize" | "purge"): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-account", { body: { mode } });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error as string };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
