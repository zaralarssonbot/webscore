import { supabase } from "@/integrations/supabase/client";
import type { ScanResult } from "./scan-service";
import { prioritize, planRoadmap } from "./recommendation-engine";

/**
 * A saved report is the permanent, shareable snapshot of one completed analysis.
 * It is written ONLY by the save-report Edge Function (service role) and read
 * publicly via RLS. The frontend never writes reports directly.
 */

/**
 * Persist the assembled report and return its public id (the /analys/:id token).
 * Best-effort: a failure returns null and never breaks the results view.
 * The internal promptContext is stripped before sending (no page text leaves).
 */
export async function saveReport(domain: string, result: ScanResult): Promise<string | null> {
  try {
    // Store the deterministic recommendations + roadmap alongside the report so
    // PDF/accounts can reuse them without re-deriving. These are pure functions
    // of the (frozen) result — the score itself is recomputed server-side.
    const recommendations = prioritize(result);
    const roadmap = planRoadmap(result);

    // Strip the internal prompt context — it is never persisted.
    const { promptContext: _drop, ...safe } = result;
    void _drop;

    const { data, error } = await supabase.functions.invoke("save-report", {
      body: { domain, report: { ...safe, recommendations, roadmap } },
    });
    if (error || !data?.reportId) {
      if (error) console.error("[report-service] saveReport failed:", error);
      return null;
    }
    return data.reportId as string;
  } catch (err) {
    console.error("[report-service] saveReport threw:", err);
    return null;
  }
}

export interface LoadedReport {
  report: ScanResult;
  domain: string;
  status: "complete" | "partial";
  partialReasons: string[];
  measuredAt: string | null;
  createdAt: string | null;
}

export type ReportResult =
  | { state: "found"; data: LoadedReport }
  | { state: "not_found" }   // missing, expired, deleted, or not public (RLS hides all identically)
  | { state: "error" };      // backend unreachable

/**
 * Load a saved report by id. Reads the persisted snapshot ONLY — it never
 * re-runs the analysis and never recomputes the score. RLS ensures only public,
 * non-expired reports are returned; anything else surfaces as "not_found".
 */
export async function fetchReport(reportId: string): Promise<ReportResult> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("id, normalized_domain, final_score, category_scores, status, partial_reasons, analysis_version, scoring_version, report_data, measured_at, created_at")
      .eq("id", reportId)
      .maybeSingle();

    if (error) {
      console.error("[report-service] fetchReport error:", error);
      return { state: "error" };
    }
    if (!data) return { state: "not_found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rd = (data.report_data ?? {}) as any;
    const domain = rd.domain || data.normalized_domain;

    // Reconstruct the ScanResult EXACTLY as saved — the persisted score is
    // authoritative and is used verbatim (never recalculated).
    const report: ScanResult = {
      scanId: data.id,
      score: data.final_score,
      categoryScores: data.category_scores,
      summary: rd.summary ?? "",
      biggestProblem: rd.biggestProblem,
      weaknesses: rd.weaknesses ?? [],
      strengths: rd.strengths ?? [],
      opportunity: rd.opportunity ?? "",
      businessImpact: rd.businessImpact ?? [],
      quickFix: rd.quickFix,
      industry: rd.industry,
      businessSummary: rd.businessSummary,
      nearbyCompetitors: rd.nearbyCompetitors ?? undefined,
      auditChecks: rd.auditChecks ?? [],
      pageInfo: rd.pageInfo ?? undefined,
      pageSpeed: rd.pageSpeed ?? null,
      scoreBreakdown: rd.scoreBreakdown ?? undefined,
      aiInsight: rd.aiInsight ?? undefined,
      measuredAt: data.measured_at ?? undefined,
      analysisVersion: data.analysis_version,
      scoringVersion: data.scoring_version,
    };

    return {
      state: "found",
      data: {
        report,
        domain,
        status: (data.status as "complete" | "partial") ?? "complete",
        partialReasons: data.partial_reasons ?? [],
        measuredAt: data.measured_at ?? null,
        createdAt: data.created_at ?? null,
      },
    };
  } catch (err) {
    console.error("[report-service] fetchReport threw:", err);
    return { state: "error" };
  }
}
