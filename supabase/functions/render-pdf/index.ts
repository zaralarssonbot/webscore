import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";
import { buildReportHtml, pdfRenderOptions, type ReportForPdf } from "./pdf-template.ts";

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
 * Render the branded report HTML to a PDF via a remote headless-Chromium
 * endpoint (Browserless-compatible `/pdf`, which runs page.pdf() server-side).
 * Supabase Edge Functions can't launch Chromium locally, so a browser-render
 * endpoint is configured via secrets. Returns the PDF bytes.
 */
async function renderPdfViaChromium(html: string, options: Record<string, unknown>): Promise<Uint8Array> {
  const base = Deno.env.get("PDF_RENDER_URL");        // e.g. https://production-sfo.browserless.io/pdf
  const token = Deno.env.get("PDF_RENDER_TOKEN") ?? "";
  if (!base) throw new Error("pdf_renderer_not_configured");
  const url = token ? `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : base;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, options }),
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 300);
    throw new Error(`render_failed_http_${resp.status}: ${detail}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
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
      .select("id, normalized_domain, final_score, category_scores, status, analysis_version, scoring_version, report_data, measured_at, created_at, pdf_path, is_public, expires_at")
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

    // Build the QR (points at the public report URL) + the branded HTML.
    const reportUrl = `https://webscore.se/analys/${reportId}`;
    const qrSvg: string = await QRCode.toString(reportUrl, {
      type: "svg", margin: 0, color: { dark: "#0A0B0F", light: "#ffffff" },
    });
    const report = toReportForPdf(row as unknown as ReportRow);
    const dateStr = String(row.created_at ?? row.measured_at ?? "").slice(0, 10);
    const html = buildReportHtml(report, { qrSvg });
    const options = pdfRenderOptions(reportId, dateStr);

    // Render via headless Chromium.
    let pdf: Uint8Array;
    try {
      pdf = await renderPdfViaChromium(html, options);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "render_error";
      if (msg === "pdf_renderer_not_configured") {
        return json({ error: "pdf_renderer_not_configured", detail: "Set PDF_RENDER_URL (+ PDF_RENDER_TOKEN) to a Browserless-compatible /pdf endpoint." }, 503);
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
