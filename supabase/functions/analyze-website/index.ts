import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractSignals,
  runAuditChecks,
  applyPageSpeedChecks,
  computeDeterministicScore,
  isMinimumValidMeasurement,
  partialReasons,
  decideRefreshAction,
  type AuditCheck,
  type PageSpeedLite,
  type CategoryScores,
} from "./measurement.ts";
import {
  buildGroundedPrompt,
  assembleInsight,
  toFlatSummary,
  AI_REPORT_VERSION,
  PROMPT_VERSION,
  type InsightContext,
  type RawAi,
} from "./ai-insight.ts";

// AI model used for the text commentary. Change here to swap models later.
const GEMINI_MODEL = "gemini-2.5-flash";
// Google's OpenAI-compatible endpoint — lets us keep the existing
// chat/completions + function-calling (website_audit) request shape.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

// ── Server-side measurement cache config ───────────────────────────
// Bump either version when the crawl/checks pipeline or scoring rules change:
// cache rows with a different version are ignored (auto-invalidated on deploy).
// ANALYSIS_VERSION bumped: fetch-time "load time" removed, real-source only.
const ANALYSIS_VERSION = "2026-07-12b";
const SCORING_VERSION = "engine-1";
const CACHE_TTL_MS = 30 * 60 * 1000;              // 30 minutes
const FORCED_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // per-domain forced-refresh limit

/** One canonical domain so hemfrid.se / www.hemfrid.se / https://…/ all match. */
function canonicalDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Structured upstream error metadata (Task 7) ────────────────────
// Every external dependency reports {ok, error?} so the caller/logs can see
// exactly which source failed and why — instead of a silent degraded result.
interface SourceStatus {
  ok: boolean;
  error?: string;      // short machine-ish reason
  detail?: string;     // human detail (status text etc.)
  source?: string;     // e.g. "firecrawl" | "fallback" | "none"
}

/** A row of the analysis_cache table (only the fields this function reads). */
interface CacheRow {
  domain: string;
  measurement: Record<string, unknown>;
  analysis_version: string;
  scoring_version: string;
  measured_at: string;
  expires_at: string;
  last_forced_at: string | null;
}

// ── PageSpeed Insights ─────────────────────────────────────────────
interface PageSpeedResult extends PageSpeedLite {
  status: SourceStatus;
}

async function fetchPageSpeedInsights(domain: string): Promise<PageSpeedResult> {
  const empty: PageSpeedLite = {
    score: null, fcp: null, lcp: null, tbt: null, cls: null, speedIndex: null, interactive: null,
  };
  try {
    const url = encodeURIComponent(`https://${domain}`);
    const psiKey = Deno.env.get("PAGESPEED_API_KEY");
    const keyParam = psiKey ? `&key=${psiKey}` : "";
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&category=performance${keyParam}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("PSI error:", resp.status, errText.slice(0, 200));
      return { ...empty, status: { ok: false, error: `http_${resp.status}`, detail: errText.slice(0, 200) } };
    }

    const data = await resp.json();
    const lhr = data.lighthouseResult;
    if (!lhr) return { ...empty, status: { ok: false, error: "no_lighthouse_result" } };

    const audits = lhr.audits || {};
    const perfScore = lhr.categories?.performance?.score;
    const score = perfScore != null ? Math.round(perfScore * 100) : null;

    return {
      score,
      fcp: audits["first-contentful-paint"]?.numericValue ?? null,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      speedIndex: audits["speed-index"]?.numericValue ?? null,
      interactive: audits["interactive"]?.numericValue ?? null,
      // A real, complete PageSpeed measurement requires a numeric score.
      status: score != null ? { ok: true } : { ok: false, error: "no_performance_score" },
    };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("PSI fetch failed:", e);
    return { ...empty, status: { ok: false, error: timedOut ? "timeout" : "fetch_failed", detail: e instanceof Error ? e.message : "Unknown" } };
  }
}

// ── Crawl with Firecrawl ───────────────────────────────────────────
type CrawlResult =
  | { ok: true; html: string; metadata: Record<string, unknown>; screenshotUrl?: string; fetchTimeMs: number }
  | { ok: false; error: string; detail?: string };

async function crawlWithFirecrawl(domain: string): Promise<CrawlResult> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { ok: false, error: "no_api_key" };

  try {
    const url = `https://${domain}`;
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html", "screenshot"], onlyMainContent: false, waitFor: 2000 }),
    });
    clearTimeout(timeout);
    const fetchTimeMs = Date.now() - startTime;

    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 200);
      console.error("Firecrawl error:", resp.status, detail);
      return { ok: false, error: `http_${resp.status}`, detail };
    }

    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    if (!html) return { ok: false, error: "empty_html" };
    return {
      ok: true,
      html,
      metadata: data.data?.metadata || data.metadata || {},
      screenshotUrl: data.data?.screenshot || data.screenshot,
      fetchTimeMs,
    };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    console.error("Firecrawl fetch failed:", e);
    return { ok: false, error: timedOut ? "timeout" : "fetch_failed", detail: e instanceof Error ? e.message : "Unknown" };
  }
}

// ── Fallback crawl (plain fetch — a DEGRADED source, never cached) ─
async function fallbackCrawl(domain: string): Promise<{ ok: boolean; html: string; error?: string }> {
  const urls = [`https://${domain}`, `http://${domain}`];
  let lastErr = "unreachable";
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WebsiteAuditBot/1.0)", Accept: "text/html" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!resp.ok) { lastErr = `http_${resp.status}`; continue; }
      const html = await resp.text();
      if (!html) { lastErr = "empty_html"; continue; }
      return { ok: true, html };
    } catch (e) {
      lastErr = e instanceof Error && e.name === "AbortError" ? "timeout" : "fetch_failed";
      continue;
    }
  }
  return { ok: false, html: "", error: lastErr };
}

// ── Real SSL/HTTPS probe ───────────────────────────────────────────
async function probeSSL(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://${domain}`, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebsiteAuditBot/1.0)" },
      redirect: "manual",
    });
    clearTimeout(timeout);
    return resp.status > 0;
  } catch {
    return false;
  }
}

// ── AI prompt (text commentary ONLY — never touches the score) ─────
// The score, category scores, pass/fail checks and recommendation order are all
// computed deterministically BEFORE this runs. The AI only phrases the findings.
// Only the short, structured signals the AI needs for industry framing — never
// raw page body text (grounding: the prompt is built from checks, not HTML).
type PromptSignals = {
  title: string; metaDesc: string; h1: string; h2s: string[];
};

// AI writes PROSE ONLY, grounded in the measured checks. It never returns scores,
// evidence ids (those are computed deterministically) or competitors.
const insightTool = {
  type: "function" as const,
  function: {
    name: "website_insight",
    description: "Return grounded, plain-language business commentary for an already-scored website analysis",
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string", description: "Identifierad bransch utifrån signalerna. På svenska." },
        business_summary: { type: "string", description: "Vad företaget gör, kort och tydligt. På svenska." },
        executive_summary: { type: "string", description: "2-3 meningar som förklarar totalbetyget utifrån de konkreta kontrollerna. På svenska." },
        biggest_problem: { type: "string", description: "Det STÖRSTA enskilda problemet, förklarat i affärstermer, kopplat till en underkänd kontroll. På svenska." },
        business_impact: { type: "array", items: { type: "string" }, description: "3 korta meningar om hur bristerna påverkar förmågan att få kunder. Ingen påhittad trafik/ranking/intäkt. På svenska." },
        quick_fix: { type: "string", description: "ETT konkret, enkelt åtgärdsförslag kopplat till en underkänd kontroll. På svenska." },
        strengths: { type: "array", items: { type: "string" }, description: "2-4 styrkor – referera till specifika GODKÄNDA kontroller. Ingen generisk beröm. På svenska." },
        weaknesses: { type: "array", items: { type: "string" }, description: "3-5 svagheter – referera till specifika UNDERKÄNDA kontroller. På svenska." },
        opportunity: { type: "string", description: "Viktigaste förbättringen utifrån de underkända kontrollerna med högst påverkan. På svenska." },
      },
      required: ["industry", "business_summary", "executive_summary", "biggest_problem", "business_impact", "quick_fix", "strengths", "weaknesses", "opportunity"],
      additionalProperties: false,
    },
  },
};

type ToolDef = { type: "function"; function: { name: string; parameters: Record<string, unknown>; description?: string } };

// Throws on any failure (timeout / non-2xx / malformed) so the caller can fall
// back to a deterministic template. Parametrised by the tool to call.
async function callGeminiTool(system: string, user: string, tool: ToolDef): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          tools: [tool],
          tool_choice: { type: "function", function: { name: tool.function.name } },
        }),
      });
    } catch (e) {
      lastErr = e;
      clearTimeout(timeout);
      continue;
    }
    clearTimeout(timeout);

    if (response.status === 429 || response.status === 503) {
      const ra = parseInt(response.headers.get("retry-after") || "", 10);
      const waitMs = Number.isFinite(ra) ? Math.min(ra * 1000, 8000) : 1000 * (attempt + 1);
      lastErr = new Error(`Gemini ${response.status}`);
      if (attempt < MAX_ATTEMPTS - 1) { await new Promise((r) => setTimeout(r, waitMs)); continue; }
      throw lastErr;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error: ${response.status} ${errorText.slice(0, 300)}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from Gemini");
    return JSON.parse(toolCall.function.arguments);
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini failed after retries");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ── Handler ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { scanId, domain, phase, forceRefresh } = body;
    if (!domain) return json({ error: "domain is required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── PHASE: SUMMARY (deferred AI prose — NEVER affects the score) ──
    if (phase === "summary") {
      const { promptContext, scores, checks } = body as {
        promptContext: PromptSignals; scores: CategoryScores & { total: number }; checks: AuditCheck[];
      };
      if (!promptContext || !scores) return json({ error: "promptContext and scores are required for summary" }, 400);

      const safeChecks = Array.isArray(checks) ? checks : [];

      // Sanitized analysis JSON only — checks + scores + short signals. No page
      // body text, no secrets, no internal prompts.
      const ctx: InsightContext = {
        domain,
        checks: safeChecks.map((c) => ({ id: c.id, label: c.label, category: c.category, passed: c.passed, detail: c.detail, impact: c.impact })),
        categoryScores: { seo: scores.seo, conversion: scores.conversion, trust: scores.trust, performance: scores.performance, security: scores.security },
        total: scores.total,
        signals: { title: promptContext.title, metaDesc: promptContext.metaDesc, h1: promptContext.h1, h2s: promptContext.h2s },
      };
      const { system, user } = buildGroundedPrompt(ctx);

      // Call Gemini; on ANY failure (timeout / non-2xx / malformed) raw stays null
      // and assembleInsight produces a complete deterministic report instead.
      let raw: RawAi | null = null;
      let failureReason: string | undefined;
      const geminiStatus: SourceStatus = { ok: true };
      try {
        raw = (await callGeminiTool(system, user, insightTool)) as RawAi;
      } catch (aiErr) {
        const msg = aiErr instanceof Error ? aiErr.message : "unknown";
        failureReason = /abort/i.test(msg) ? "gemini_timeout" : /JSON|Unexpected token|parse/i.test(msg) ? "malformed_json" : "gemini_error";
        console.error("AI insight failed — using deterministic fallback:", msg);
        geminiStatus.ok = false;
        geminiStatus.error = msg.slice(0, 160);
      }

      const baseMeta = {
        aiReportVersion: AI_REPORT_VERSION, promptVersion: PROMPT_VERSION, model: GEMINI_MODEL,
        analysisVersion: ANALYSIS_VERSION, scoringVersion: SCORING_VERSION,
        reportId: (body.reportId as string | undefined) ?? null, createdAt: new Date().toISOString(),
      };
      const insight = assembleInsight(raw, ctx, baseMeta, failureReason);
      const flat = toFlatSummary(insight);

      // Append-only, VERSIONED persistence — never overwrite historical AI output.
      const dbStatus: SourceStatus = { ok: true };
      try {
        await supabase.from("ai_reports").insert({
          scan_id: scanId ?? null,
          industry: insight.industry,
          industry_confidence: insight.meta.aiGenerated ? null : 0,
          business_summary: insight.businessSummary,
          overall_summary: insight.executiveSummary.text,
          final_score: scores.total,
          weaknesses_json: insight.weaknesses.items,
          strengths_json: insight.strengths.items,
          biggest_opportunity: insight.opportunity.text,
          ai_report_version: insight.meta.aiReportVersion,
          prompt_version: insight.meta.promptVersion,
          model: insight.meta.model,
          analysis_version: insight.meta.analysisVersion,
          scoring_version: insight.meta.scoringVersion,
          report_id: insight.meta.reportId,
          ai_generated: insight.meta.aiGenerated,
          fallback_reason: insight.meta.fallbackReason ?? null,
          validation_errors: insight.meta.validationErrors,
          insight,
        });
        if (scanId) await supabase.from("scans").update({ status: "complete" }).eq("id", scanId);
      } catch (e) {
        console.error("ai_reports persist failed (non-fatal):", e);
        dbStatus.ok = false;
        dbStatus.error = e instanceof Error ? e.message.slice(0, 160) : "unknown";
      }

      return json({
        scanId,
        aiGenerated: insight.meta.aiGenerated,
        ...flat,
        aiInsight: insight,
        validationErrors: insight.meta.validationErrors,
        fallbackReason: insight.meta.fallbackReason ?? null,
        dataSources: { gemini: geminiStatus, db: dbStatus },
      });
    }

    // ── PHASE: SCORE (default) ──────────────────────────────────────
    if (!scanId) return json({ error: "scanId is required" }, 400);

    const canonical = canonicalDomain(domain);
    const nowMs = Date.now();
    let cacheRow: CacheRow | null = null;
    const cacheReadStatus: SourceStatus = { ok: true };
    try {
      const { data, error } = await supabase.from("analysis_cache").select("*").eq("domain", canonical).maybeSingle();
      if (error) throw error;
      cacheRow = (data as CacheRow | null) ?? null;
    } catch (e) {
      console.error("cache read failed (non-fatal):", e);
      cacheReadStatus.ok = false;
      cacheReadStatus.error = e instanceof Error ? e.message.slice(0, 160) : "unknown";
    }

    const versionOk = !!cacheRow && cacheRow.analysis_version === ANALYSIS_VERSION && cacheRow.scoring_version === SCORING_VERSION;
    const cacheFresh = !!cacheRow && versionOk && new Date(cacheRow.expires_at).getTime() > nowMs;
    // A previous measurement is "valid" for preservation if it's the right
    // version and actually holds a measurement — even if the TTL has lapsed.
    const hasPreviousValid = versionOk && !!cacheRow?.measurement;

    const respondCached = (row: CacheRow, extra: Record<string, unknown> = {}) =>
      json({
        ...row.measurement,
        scanId,
        cached: true,
        status: "complete",
        partial: false,
        measuredAt: row.measured_at,
        expiresAt: row.expires_at,
        analysisVersion: row.analysis_version,
        scoringVersion: row.scoring_version,
        ...extra,
      });

    if (forceRefresh) {
      const recentlyForced = !!cacheRow && versionOk && !!cacheRow.last_forced_at &&
        (nowMs - new Date(cacheRow.last_forced_at).getTime() < FORCED_REFRESH_COOLDOWN_MS);
      if (recentlyForced && cacheRow && cacheRow.measurement) {
        await supabase.from("scans").update({ status: "complete" }).eq("id", scanId);
        return respondCached(cacheRow, { refreshRateLimited: true });
      }
    } else if (cacheFresh && cacheRow) {
      await supabase.from("scans").update({ status: "complete" }).eq("id", scanId);
      return respondCached(cacheRow);
    }

    const t0 = Date.now();
    await supabase.from("scans").update({ status: "crawling" }).eq("id", scanId);

    // Firecrawl + PageSpeed + SSL probe run in parallel (the long pole is PSI).
    const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
      const t = Date.now(); const r = await fn(); return [r, Date.now() - t];
    };
    const [[crawl, firecrawlMs], [psi, psiMs], [sslOk, sslMs]] = await Promise.all([
      timed(() => crawlWithFirecrawl(domain)),
      timed(() => fetchPageSpeedInsights(domain)),
      timed(() => probeSSL(domain)),
    ]);

    // Resolve the crawl: prefer Firecrawl (rendered), else a plain-fetch fallback
    // (DEGRADED — never cached). Track the real source for provenance.
    let html = "";
    let screenshotUrl: string | undefined;
    let metadata: Record<string, unknown> | undefined;
    let usedFirecrawl = false;
    const crawlStatus: SourceStatus = { ok: false, source: "none" };

    if (crawl.ok) {
      html = crawl.html;
      screenshotUrl = crawl.screenshotUrl;
      metadata = crawl.metadata;
      usedFirecrawl = true;
      crawlStatus.ok = true;
      crawlStatus.source = "firecrawl";
    } else {
      const fb = await fallbackCrawl(domain);
      if (fb.ok) {
        html = fb.html;
        crawlStatus.ok = true;
        crawlStatus.source = "fallback";
        crawlStatus.error = `firecrawl_${crawl.error}`; // why we fell back
      } else {
        crawlStatus.ok = false;
        crawlStatus.source = "none";
        crawlStatus.error = `firecrawl_${crawl.error}; fallback_${fb.error}`;
      }
    }

    const psiStatus = psi.status;

    // Hard failure: no HTML from any source → explicit error, never a fake result.
    if (!html) {
      await supabase.from("scans").update({ status: "failed" }).eq("id", scanId);
      return json({
        error: "Kunde inte nå hemsidan. Kontrollera att domänen stämmer.",
        status: "failed",
        dataSources: { crawl: crawlStatus, pageSpeed: psiStatus, ssl: { ok: sslOk } },
      }, 400);
    }

    // Extract signals & run deterministic checks.
    await supabase.from("scans").update({ status: "auditing" }).eq("id", scanId);
    const signals = extractSignals(html, domain, screenshotUrl, metadata, sslOk);
    let checks = runAuditChecks(signals);
    // Add REAL Lighthouse checks only when PSI actually measured them.
    const psiOk = psiStatus.ok && psi.score != null;
    if (psiOk) checks = applyPageSpeedChecks(checks, psi);

    // THE score — deterministic, identical to the frontend engine, no AI input.
    const psiForScore: PageSpeedLite | null = psiOk ? psi : null;
    const scoreResult = computeDeterministicScore(checks, psiForScore);
    const cats = scoreResult.categoryScores;

    await supabase.from("scans").update({ status: "ai_analysis" }).eq("id", scanId);

    // Short structured signals the deferred AI step needs for industry framing —
    // deliberately NO page body text (grounding: the prompt is built from checks).
    const promptContext: PromptSignals = {
      title: signals.title, metaDesc: signals.metaDesc, h1: signals.h1, h2s: signals.h2s,
    };

    // The cacheable measurement. estimatedLoadTimeMs is the REAL LCP or null —
    // we never present our network round-trip as the site's load time.
    const measurement = {
      scanId,
      score: scoreResult.total,
      categoryScores: cats,
      auditChecks: checks,
      pageInfo: {
        title: signals.title,
        metaDesc: signals.metaDesc,
        h1: signals.h1,
        wordCount: signals.wordCount,
        imgCount: signals.imgCount,
        screenshotUrl: signals.screenshotUrl,
        ctaCount: signals.ctaCount,
        sectionCount: signals.sectionCount,
        trustSignalCount: signals.trustSignalCount,
        estimatedLoadTimeMs: psiOk ? psi.lcp : null,
      },
      pageSpeed: psiOk ? {
        score: psi.score, fcp: psi.fcp, lcp: psi.lcp, tbt: psi.tbt,
        cls: psi.cls, speedIndex: psi.speedIndex, interactive: psi.interactive,
      } : null,
      promptContext,
      scores: { seo: cats.seo, conversion: cats.conversion, trust: cats.trust, performance: cats.performance, security: cats.security, total: scoreResult.total },
      dataSources: { crawl: crawlStatus, pageSpeed: psiStatus, ssl: { ok: sslOk } },
    };

    // ── Minimum valid measurement (Task 5) ────────────────────────
    const measurementComplete = isMinimumValidMeasurement({
      usedFirecrawl, htmlPresent: !!html, psiOk, checkCount: checks.length,
    });
    const reasons = partialReasons({ usedFirecrawl, htmlPresent: !!html, psiOk, checkCount: checks.length });

    // ── Forced-refresh / partial preservation (Task 6) ────────────
    // If this run did not produce a complete measurement but a previous valid
    // one exists, KEEP the old measurement instead of returning/among caching a
    // degraded one. Good data is never overwritten by bad.
    const action = decideRefreshAction({ freshComplete: measurementComplete, hasPreviousValid });

    if (action.respondWith === "previous" && cacheRow) {
      await supabase.from("scans").update({ status: "complete" }).eq("id", scanId);
      return respondCached(cacheRow, {
        refreshFailed: true,
        servedPreviousMeasurement: true,
        freshAttempt: { status: "partial", partialReasons: reasons, dataSources: measurement.dataSources },
      });
    }

    const measuredAt = new Date().toISOString();
    const expiresAt = measurementComplete ? new Date(Date.now() + CACHE_TTL_MS).toISOString() : null;
    let cacheWriteStatus: SourceStatus = { ok: true, source: measurementComplete ? "written" : "skipped_partial" };

    if (action.cache && measurementComplete) {
      try {
        await supabase.from("analysis_cache").upsert({
          domain: canonical,
          measurement,
          analysis_version: ANALYSIS_VERSION,
          scoring_version: SCORING_VERSION,
          measured_at: measuredAt,
          expires_at: expiresAt,
          last_forced_at: forceRefresh ? measuredAt : (cacheRow?.last_forced_at ?? null),
        });
      } catch (e) {
        console.error("cache write failed (non-fatal):", e);
        cacheWriteStatus = { ok: false, error: e instanceof Error ? e.message.slice(0, 160) : "unknown" };
      }
    }

    return json({
      ...measurement,
      cached: false,
      status: measurementComplete ? "complete" : "partial",
      partial: !measurementComplete,
      partialReasons: measurementComplete ? [] : reasons,
      measuredAt,
      expiresAt,
      analysisVersion: ANALYSIS_VERSION,
      scoringVersion: SCORING_VERSION,
      dataSources: {
        ...measurement.dataSources,
        cacheRead: cacheReadStatus,
        cacheWrite: cacheWriteStatus,
      },
      _timings: {
        firecrawlMs, psiMs, sslMs,
        scorePhaseMs: Date.now() - t0,
      },
    });
  } catch (e) {
    console.error("analyze-website error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error", status: "failed" }, 500);
  }
});
