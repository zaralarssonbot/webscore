// M5 — claim-report. The ONLY sanctioned way to attach ownership to a report
// that was created anonymously (the M2 /analys/:id flow). See M5_SPEC.md §4.8.
//
// Auth: requires a verified user JWT. Ownership is taken from the JWT, never the
// body. Idempotent. Refuses to claim a report already owned by someone else.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId, audit, hashIp } from "../_shared/auth.ts";
import { canonicalDomain } from "../_shared/canonical-domain.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { reportId } = (await req.json()) as { reportId?: string };
    if (!reportId) return json({ error: "reportId is required" }, 400);

    const svc = serviceClient();

    const { data: report, error: rErr } = await svc.from("reports")
      .select("id, user_id, normalized_domain, final_score")
      .eq("id", reportId).maybeSingle();
    if (rErr) throw rErr;
    if (!report) return json({ error: "not_found" }, 404);

    // Already owned?
    if (report.user_id) {
      if (report.user_id === uid) {
        return json({ ok: true, reportId, alreadyOwned: true });
      }
      return json({ error: "owned_by_other" }, 409);
    }

    const canonical = canonicalDomain(report.normalized_domain);

    // Resolve or create the user's domain row for this report's domain.
    let domainId: string | null = null;
    let dom = (await svc.from("domains").select("id")
      .eq("user_id", uid).eq("normalized_domain", canonical).maybeSingle()).data as { id: string } | null;
    if (!dom) {
      const ins = await svc.from("domains")
        .insert({ user_id: uid, normalized_domain: canonical, display_name: canonical })
        .select("id").maybeSingle();
      dom = (ins.data as { id: string } | null)
        ?? (await svc.from("domains").select("id")
              .eq("user_id", uid).eq("normalized_domain", canonical).maybeSingle()).data as { id: string } | null;
    }
    if (dom) domainId = dom.id;

    // Attach ownership. The where-clause re-checks user_id is null to avoid a
    // race where two claims land at once (only the first wins).
    const { data: updated, error: uErr } = await svc.from("reports")
      .update({ user_id: uid, domain_id: domainId })
      .eq("id", reportId).is("user_id", null)
      .select("id").maybeSingle();
    if (uErr) throw uErr;
    if (!updated) {
      // Someone claimed it in the tiny window between our read and write.
      const { data: recheck } = await svc.from("reports").select("user_id").eq("id", reportId).maybeSingle();
      if (recheck?.user_id === uid) return json({ ok: true, reportId, alreadyOwned: true });
      return json({ error: "owned_by_other" }, 409);
    }

    // Link the domain's denormalized latest_* if this is now its newest report.
    if (domainId) {
      await svc.from("domains").update({
        latest_report_id: reportId,
        latest_score: report.final_score,
        last_analyzed_at: new Date().toISOString(),
      }).eq("id", domainId).eq("user_id", uid);
    }

    await audit(svc, uid, "report_claimed", reportId, await hashIp(req), { domain: canonical });
    return json({ ok: true, reportId, domainId });
  } catch (e) {
    console.error("claim-report error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
