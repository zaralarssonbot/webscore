// M5 shared notification writer. Service-role only. Respects the user's
// per-type toggles in user_settings before inserting. Never throws. §12.

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotifyType =
  | "analysis_complete"
  | "score_changed"
  | "pdf_ready"
  | "domain_verified"
  | "weekly_digest";

const SETTING_COLUMN: Record<NotifyType, string | null> = {
  analysis_complete: "notify_analysis_complete",
  score_changed: "notify_score_changed",
  pdf_ready: "notify_pdf_ready",
  weekly_digest: "notify_weekly_digest",
  domain_verified: null, // always delivered
};

export async function notify(
  svc: SupabaseClient,
  userId: string,
  type: NotifyType,
  title: string,
  body: string | null,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const col = SETTING_COLUMN[type];
    if (col) {
      const { data: settings } = await svc
        .from("user_settings").select(col).eq("user_id", userId).maybeSingle();
      // Default to enabled if no settings row yet (matches table defaults).
      if (settings && (settings as Record<string, unknown>)[col] === false) return;
    }
    await svc.from("notifications").insert({ user_id: userId, type, title, body, data });
  } catch (e) {
    console.error("[notify] failed (non-fatal):", e);
  }
}

/** The user's configured score-change threshold (default 3). */
export async function scoreChangeThreshold(svc: SupabaseClient, userId: string): Promise<number> {
  try {
    const { data } = await svc
      .from("user_settings").select("score_change_threshold").eq("user_id", userId).maybeSingle();
    const t = (data as { score_change_threshold?: number } | null)?.score_change_threshold;
    return typeof t === "number" ? t : 3;
  } catch {
    return 3;
  }
}
