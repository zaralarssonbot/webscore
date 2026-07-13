// M5 — export-account-data (GDPR §14.1). Returns a single JSON document with
// ALL of the caller's data and nothing belonging to anyone else. Auth via JWT;
// data gathered with the service role but strictly filtered to auth.uid().

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight, corsHeaders } from "../_shared/http.ts";
import { serviceClient, getUserId, rateLimit, audit, hashIp } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const svc = serviceClient();
    if (!(await rateLimit(svc, `user:${uid}`, "export", 1, 3_600_000))) {
      return json({ error: "rate_limited" }, 429);
    }

    const [profile, settings, domains, reports, notifications] = await Promise.all([
      svc.from("profiles").select("*").eq("id", uid).maybeSingle(),
      svc.from("user_settings").select("*").eq("user_id", uid).maybeSingle(),
      svc.from("domains").select("*").eq("user_id", uid),
      svc.from("reports").select(
        "id, normalized_domain, final_score, category_scores, status, analysis_version, scoring_version, report_data, measured_at, created_at, domain_id, title"
      ).eq("user_id", uid),
      svc.from("notifications").select("*").eq("user_id", uid),
    ]);

    const bundle = {
      exportedAt: new Date().toISOString(),
      schema: "webscore-account-export-1",
      userId: uid,
      profile: profile.data ?? null,
      settings: settings.data ?? null,
      domains: domains.data ?? [],
      reports: reports.data ?? [],
      notifications: notifications.data ?? [],
    };

    await audit(svc, uid, "account_export", null, await hashIp(req),
      { domains: bundle.domains.length, reports: bundle.reports.length });

    const filename = `webscore-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("export-account-data error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
