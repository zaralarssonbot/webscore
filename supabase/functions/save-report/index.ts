import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeDeterministicScore,
  MIN_CHECKS,
  type AuditCheck,
  type PageSpeedLite,
} from "../analyze-website/measurement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYSIS_VERSION = "2026-07-12b";
const SCORING_VERSION = "engine-1";

/** One canonical domain (mirrors analyze-website). */
function canonicalDomain(input: string): string {
  return input.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "")
    .replace(/[/?#].*$/, "").replace(/:\d+$/, "");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Keep only display-safe page fields — never raw page text or upstream payloads. */
function sanitizePageInfo(p: Record<string, unknown> | undefined | null) {
  if (!p || typeof p !== "object") return null;
  const pick = (k: string) => (p as Record<string, unknown>)[k];
  return {
    title: pick("title") ?? null,
    metaDesc: pick("metaDesc") ?? null,
    h1: pick("h1") ?? null,
    wordCount: pick("wordCount") ?? null,
    imgCount: pick("imgCount") ?? null,
    screenshotUrl: pick("screenshotUrl") ?? null,
    ctaCount: pick("ctaCount") ?? null,
    sectionCount: pick("sectionCount") ?? null,
    trustSignalCount: pick("trustSignalCount") ?? null,
    estimatedLoadTimeMs: pick("estimatedLoadTimeMs") ?? null,
  };
}

type AnyObj = Record<string, unknown>;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { domain, report } = body as { domain?: string; report?: AnyObj };
    if (!domain || !report) return json({ error: "domain and report are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const canonical = canonicalDomain(domain);

    // ── Authoritative measurement ────────────────────────────────────
    // Prefer the service-role-written analysis_cache (server truth). Only fall
    // back to the client-supplied checks for partials (which are never cached).
    let checks: AuditCheck[] = Array.isArray(report.auditChecks) ? (report.auditChecks as AuditCheck[]) : [];
    let pageSpeed: PageSpeedLite | null = (report.pageSpeed as PageSpeedLite | null) ?? null;
    let fromCache = false;
    try {
      const { data: cache } = await supabase.from("analysis_cache").select("measurement,analysis_version,scoring_version")
        .eq("domain", canonical).maybeSingle();
      const m = cache?.measurement as AnyObj | undefined;
      if (m && Array.isArray(m.auditChecks) && m.auditChecks.length) {
        checks = m.auditChecks as AuditCheck[];
        pageSpeed = (m.pageSpeed as PageSpeedLite | null) ?? null;
        fromCache = true;
      }
    } catch (e) { console.error("cache read failed (non-fatal):", e); }

    // ── Deterministic score — recomputed server-side, NEVER trust the client
    // number and NEVER let AI influence it. Pure function of checks + PageSpeed.
    const sr = computeDeterministicScore(checks, pageSpeed);
    const psiOk = !!pageSpeed && typeof pageSpeed.score === "number";
    const status: "complete" | "partial" = psiOk && checks.length >= MIN_CHECKS ? "complete" : "partial";
    const partialReasons: string[] = status === "partial"
      ? (Array.isArray(report.partialReasons) && report.partialReasons.length
          ? (report.partialReasons as string[])
          : [!psiOk ? "pagespeed_unavailable" : "too_few_checks"])
      : [];

    // ── Sanitized, renderable snapshot — no promptContext, no page text, no
    // secrets. Score/categoryScores are the SERVER-recomputed authoritative ones.
    const report_data = {
      domain: String(domain),
      score: sr.total,
      categoryScores: sr.categoryScores,
      summary: report.summary ?? "",
      biggestProblem: report.biggestProblem ?? undefined,
      weaknesses: Array.isArray(report.weaknesses) ? report.weaknesses : [],
      strengths: Array.isArray(report.strengths) ? report.strengths : [],
      opportunity: report.opportunity ?? "",
      businessImpact: Array.isArray(report.businessImpact) ? report.businessImpact : [],
      quickFix: report.quickFix ?? undefined,
      industry: report.industry ?? undefined,
      businessSummary: report.businessSummary ?? undefined,
      nearbyCompetitors: Array.isArray(report.nearbyCompetitors) ? report.nearbyCompetitors : null,
      auditChecks: checks,
      pageInfo: sanitizePageInfo(report.pageInfo as Record<string, unknown> | undefined | null),
      pageSpeed,
      scoreBreakdown: report.scoreBreakdown ?? null,
      recommendations: report.recommendations ?? null,
      roadmap: report.roadmap ?? null,
      status,
      partialReasons,
      measuredAt: report.measuredAt ?? null,
      analysisVersion: report.analysisVersion ?? ANALYSIS_VERSION,
      scoringVersion: report.scoringVersion ?? SCORING_VERSION,
      fromCache,
    };

    const { data: inserted, error } = await supabase.from("reports").insert({
      normalized_domain: canonical,
      final_score: sr.total,
      category_scores: sr.categoryScores,
      status,
      partial_reasons: partialReasons,
      analysis_version: report.analysisVersion ?? ANALYSIS_VERSION,
      scoring_version: report.scoringVersion ?? SCORING_VERSION,
      report_data,
      is_public: true,
      measured_at: report.measuredAt ?? null,
    }).select("id").single();

    if (error) throw error;
    return json({ reportId: inserted.id, status, score: sr.total });
  } catch (e) {
    console.error("save-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
