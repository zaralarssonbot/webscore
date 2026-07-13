// M5 — delete-account (GDPR §14.2). Irreversible. Auth via JWT; the caller can
// ONLY delete their own account (id from the verified token, never the body).
//
// Reports handling (user's explicit choice):
//   mode = 'anonymize' (default): keep public reports but strip ownership so
//          shared /analys/:id links survive; delete non-public owned reports.
//   mode = 'purge': hard-delete ALL owned reports.
// Then remove domains, notifications, settings, profile, and the auth identity.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId, rateLimit, audit, hashIp } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { mode } = (await req.json().catch(() => ({}))) as { mode?: "anonymize" | "purge" };
    const purge = mode === "purge";

    const svc = serviceClient();
    if (!(await rateLimit(svc, `user:${uid}`, "delete", 3, 86_400_000))) {
      return json({ error: "rate_limited" }, 429);
    }

    await audit(svc, uid, "account_delete_requested", null, await hashIp(req), { mode: mode ?? "anonymize" });

    // 1) Reports first (before domain FKs disappear).
    if (purge) {
      await svc.from("reports").delete().eq("user_id", uid);
    } else {
      // Non-public owned reports are deleted; public ones revert to anonymous.
      await svc.from("reports").delete().eq("user_id", uid).eq("is_public", false);
      await svc.from("reports").update({ user_id: null, domain_id: null }).eq("user_id", uid);
    }

    // 2) Account-scoped rows. Most cascade from auth.users deletion, but we do it
    //    explicitly for deterministic ordering and control.
    await svc.from("notifications").delete().eq("user_id", uid);
    await svc.from("domains").delete().eq("user_id", uid);
    await svc.from("user_settings").delete().eq("user_id", uid);
    await svc.from("profiles").delete().eq("id", uid);

    // 3) The auth identity itself (cascades anything remaining).
    const { error: delErr } = await svc.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    await audit(svc, null, "account_deleted", null, await hashIp(req), { mode: mode ?? "anonymize" });
    return json({ ok: true, mode: mode ?? "anonymize" });
  } catch (e) {
    console.error("delete-account error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
