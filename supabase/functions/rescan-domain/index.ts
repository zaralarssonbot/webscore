// M5 — rescan-domain. Internal, service-role scheduled re-analysis of a verified
// + monitoring-enabled domain (§15.6). Called by the cron/queue (protected by a
// shared secret), NOT by browsers. It refreshes the measurement via the frozen
// analyze-website function, then writes a NEW owned report through the same
// deterministic-score path save-report uses (analysis_cache = server truth).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient } from "../_shared/auth.ts";
import { notify, scoreChangeThreshold } from "../_shared/notify.ts";
import { resolveEntitlements } from "../_shared/entitlements.ts";
import { canonicalDomain } from "../_shared/canonical-domain.ts";
import {
  computeDeterministicScore, MIN_CHECKS,
  type AuditCheck, type PageSpeedLite,
} from "../analyze-website/measurement.ts";

const ANALYSIS_VERSION = "2026-07-12b";
const SCORING_VERSION = "engine-1";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    // Internal auth: shared secret. If CRON_SECRET is unset, refuse (fail closed)
    // so this can never be driven anonymously.
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret || req.headers.get("x-webscore-cron") !== secret) {
      return json({ error: "forbidden" }, 403);
    }

    const { domainId } = (await req.json()) as { domainId?: string };
    if (!domainId) return json({ error: "domainId is required" }, 400);

    const svc = serviceClient();

    const { data: domain } = await svc.from("domains")
      .select("id, user_id, normalized_domain, verified, monitoring_enabled, latest_score")
      .eq("id", domainId).maybeSingle();
    if (!domain) return json({ error: "not_found" }, 404);
    if (!domain.verified || !domain.monitoring_enabled) {
      return json({ error: "not_eligible" }, 409);
    }
    // M6: defensive plan gate (covers a downgrade after monitoring was enabled).
    if ((await resolveEntitlements(svc, domain.user_id)).limits.monitoring === "none") {
      return json({ error: "not_in_plan" }, 402);
    }

    const canonical = canonicalDomain(domain.normalized_domain);

    // 1) Refresh the measurement (writes analysis_cache) via the frozen function.
    try {
      await svc.functions.invoke("analyze-website", { body: { domain: canonical, forceRefresh: true } });
    } catch (e) {
      console.error("analyze-website invoke failed (will use cache if present):", e);
    }

    // 2) Read the authoritative cached measurement.
    const { data: cache } = await svc.from("analysis_cache")
      .select("measurement, analysis_version, scoring_version, measured_at")
      .eq("domain", canonical).maybeSingle();
    const m = (cache?.measurement ?? {}) as Record<string, unknown>;
    const checks: AuditCheck[] = Array.isArray(m.auditChecks) ? (m.auditChecks as AuditCheck[]) : [];
    const pageSpeed: PageSpeedLite | null = (m.pageSpeed as PageSpeedLite | null) ?? null;
    if (!checks.length) return json({ error: "no_measurement" }, 502);

    // 3) Deterministic score — identical path to save-report.
    const sr = computeDeterministicScore(checks, pageSpeed);
    const psiOk = !!pageSpeed && typeof pageSpeed.score === "number";
    const status: "complete" | "partial" = psiOk && checks.length >= MIN_CHECKS ? "complete" : "partial";
    const partialReasons = status === "partial" ? [psiOk ? "too_few_checks" : "pagespeed_unavailable"] : [];

    const report_data = {
      domain: canonical,
      score: sr.total,
      categoryScores: sr.categoryScores,
      auditChecks: checks,
      pageInfo: m.pageInfo ?? null,
      pageSpeed,
      status,
      partialReasons,
      measuredAt: cache?.measured_at ?? new Date().toISOString(),
      analysisVersion: cache?.analysis_version ?? ANALYSIS_VERSION,
      scoringVersion: cache?.scoring_version ?? SCORING_VERSION,
      source: "monitoring",
    };

    const { data: inserted, error } = await svc.from("reports").insert({
      normalized_domain: canonical,
      final_score: sr.total,
      category_scores: sr.categoryScores,
      status,
      partial_reasons: partialReasons,
      analysis_version: cache?.analysis_version ?? ANALYSIS_VERSION,
      scoring_version: cache?.scoring_version ?? SCORING_VERSION,
      report_data,
      is_public: true,
      measured_at: cache?.measured_at ?? new Date().toISOString(),
      user_id: domain.user_id,
      domain_id: domain.id,
    }).select("id").single();
    if (error) throw error;

    const prevScore = domain.latest_score as number | null;
    await svc.from("domains").update({
      latest_report_id: inserted.id, latest_score: sr.total, last_analyzed_at: new Date().toISOString(),
    }).eq("id", domain.id);

    await notify(svc, domain.user_id, "analysis_complete",
      `Övervakning: analys klar för ${canonical}`, `Ny poäng: ${sr.total}.`,
      { report_id: inserted.id, domain_id: domain.id, score: sr.total });

    let delta: number | null = null;
    if (typeof prevScore === "number") {
      delta = sr.total - prevScore;
      const threshold = await scoreChangeThreshold(svc, domain.user_id);
      if (Math.abs(delta) >= threshold) {
        await notify(svc, domain.user_id, "score_changed",
          `Poängen ${delta > 0 ? "ökade" : "minskade"} för ${canonical}`,
          `${prevScore} → ${sr.total} (${delta > 0 ? "+" : ""}${delta}).`,
          { report_id: inserted.id, domain_id: domain.id, prev: prevScore, next: sr.total, delta });
      }
    }

    return json({ ok: true, reportId: inserted.id, score: sr.total, delta });
  } catch (e) {
    console.error("rescan-domain error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
