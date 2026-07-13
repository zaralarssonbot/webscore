import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";
import { buildReportHtml, pdfRenderOptions, type ReportForPdf } from "./pdf-template.ts";
// M6 additive: PDF monthly quota + Free-tier watermark (owner-based).
import { getUserId } from "../_shared/auth.ts";
import { resolveEntitlements, checkAndBumpUsage } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "report-pdfs";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Render the branded report HTML to a PDF using Cloudflare Browser Rendering
 * (self-hosted within the Cloudflare/Supabase stack — no third-party service).
 * Cloudflare runs headless Chromium page.pdf() server-side and returns the PDF
 * bytes. Configured via CF_ACCOUNT_ID + CF_API_TOKEN function secrets.
 */
async function renderPdfViaChromium(html: string, options: Record<string, unknown>): Promise<Uint8Array> {
  const account = Deno.env.get("CF_ACCOUNT_ID");
  const token = Deno.env.get("CF_API_TOKEN");
  if (!account || !token) throw new Error("pdf_renderer_not_configured");

  // Cloudflare's /pdf expects PDF options under `pdfOptions` and lowercase format.
  const pdfOptions = { ...options, format: String(options.format ?? "a4").toLowerCase() };
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/pdf`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ html, pdfOptions, gotoOptions: { waitUntil: "networkidle0" } }),
  });

  // Success → application/pdf binary. Failure → non-2xx (or a JSON error body).
  const ct = resp.headers.get("content-type") ?? "";
  if (!resp.ok || ct.includes("application/json")) {
    const detail = (await resp.text()).slice(0, 400);
    throw new Error(`render_failed_http_${resp.status}: ${detail}`);
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.length < 5 || bytes[0] !== 0x25 /* % */) {
    throw new Error("render_failed_not_pdf");
  }
  return bytes;
}

interface ReportRow {
  id: string;
  normalized_domain: string;
  final_score: number;
  category_scores: ReportForPdf["categoryScores"];
  status: "complete" | "partial";
  analysis_version: string;
  scoring_version: string;
  report_data: Record<string, unknown> | null;
  measured_at: string | null;
  created_at: string | null;
  pdf_path: string | null;
}

function toReportForPdf(row: ReportRow): ReportForPdf {
  const rd = (row.report_data ?? {}) as Record<string, unknown>;
  const s = (k: string) => rd[k] as string | undefined;
  const a = <T,>(k: string) => rd[k] as T | undefined;
  return {
    reportId: row.id,
    domain: rd.domain ?? row.normalized_domain,
    score: row.final_score,
    categoryScores: row.category_scores,
    status: row.status,
    analysisVersion: row.analysis_version,
    scoringVersion: row.scoring_version,
    measuredAt: row.measured_at,
    createdAt: row.created_at,
    summary: s("summary"),
    businessSummary: s("businessSummary"),
    industry: s("industry"),
    biggestProblem: s("biggestProblem"),
    businessImpact: a<string[]>("businessImpact"),
    opportunity: s("opportunity"),
    quickFix: s("quickFix"),
    strengths: a<string[]>("strengths"),
    weaknesses: a<string[]>("weaknesses"),
    auditChecks: a<ReportForPdf["auditChecks"]>("auditChecks"),
    aiInsight: a<ReportForPdf["aiInsight"]>("aiInsight"),
    roadmap: a<ReportForPdf["roadmap"]>("roadmap"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { reportId, force } = body as { reportId?: string; force?: boolean };
    if (!reportId) return json({ error: "reportId is required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load ONLY the stored, immutable snapshot. Never trust client data.
    const { data: row, error } = await supabase
      .from("reports")
      .select("id, normalized_domain, final_score, category_scores, status, analysis_version, scoring_version, report_data, measured_at, created_at, pdf_path, is_public, expires_at, user_id")
      .eq("id", reportId)
      .maybeSingle();
    if (error) return json({ error: "lookup_failed" }, 500);
    if (!row) return json({ error: "report_not_found", state: "not_found" }, 404);

    const storagePath = `${reportId}.pdf`;

    // Dedup: an existing PDF is returned as a fresh signed URL — never re-rendered.
    if (row.pdf_path && !force) {
      const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL);
      if (!sErr && signed?.signedUrl) {
        return json({ signedUrl: signed.signedUrl, cached: true, pdfPath: storagePath, expiresIn: SIGNED_URL_TTL });
      }
      // If the object vanished, fall through and regenerate.
    }

    // ── M6 additive: a NEW render is imminent (dedup returned above otherwise).
    // For OWNED reports, apply the owner's watermark and enforce the caller's
    // monthly PDF quota when the caller is the owner. Anonymous public reports
    // (user_id=null) keep the frozen M4 behavior (no quota, no watermark).
    const ownerId = (row as { user_id?: string | null }).user_id ?? null;
    let watermark = false;
    if (ownerId) {
      const ownerEnt = await resolveEntitlements(supabase, ownerId);
      watermark = !!ownerEnt.limits.pdf_watermark;
      const callerId = await getUserId(req);
      if (callerId && callerId === ownerId) {
        const gate = await checkAndBumpUsage(supabase, callerId, "pdf_month", ownerEnt.limits.pdf_month);
        if (!gate.allowed) return json({ error: "quota_exceeded", metric: "pdf_month", limit: gate.limit, used: gate.count }, 402);
      }
    }

    // Build the QR (points at the public report URL) + the branded HTML.
    const reportUrl = `https://webscore.se/analys/${reportId}`;
    const qrSvg: string = await QRCode.toString(reportUrl, {
      type: "svg", margin: 0, color: { dark: "#0A0B0F", light: "#ffffff" },
    });
    const report = toReportForPdf(row as unknown as ReportRow);
    const dateStr = String(row.created_at ?? row.measured_at ?? "").slice(0, 10);
    const html = buildReportHtml(report, { qrSvg, watermark });
    const options = pdfRenderOptions(reportId, dateStr);

    // Render via headless Chromium.
    let pdf: Uint8Array;
    try {
      pdf = await renderPdfViaChromium(html, options);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render_error";
      if (msg === "pdf_renderer_not_configured") {
        return json({ error: "pdf_renderer_not_configured", detail: "Set CF_ACCOUNT_ID + CF_API_TOKEN (Cloudflare Browser Rendering) as function secrets." }, 503);
      }
      return json({ error: "render_failed", detail: msg }, 502);
    }

    // Upload the immutable artifact + record it on the snapshot.
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, pdf, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) return json({ error: "upload_failed", detail: upErr.message }, 500);

    await supabase.from("reports").update({ pdf_path: storagePath, pdf_generated_at: new Date().toISOString() }).eq("id", reportId);

    const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL);
    if (sErr || !signed?.signedUrl) return json({ error: "sign_failed" }, 500);

    return json({ signedUrl: signed.signedUrl, cached: false, pdfPath: storagePath, bytes: pdf.length, expiresIn: SIGNED_URL_TTL });
  } catch (e) {
    console.error("render-pdf error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
