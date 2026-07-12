import { supabase } from "@/integrations/supabase/client";
import { normalizeDomain } from "./domain";
import { computeScore, deriveFindings, type ScoreBreakdown } from "./scoring-engine";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Surface a misconfigured frontend loudly at startup (masked) rather than
// letting it fail mysteriously deep inside a fetch.
if (!SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "[scan-service] Saknar Supabase-env. VITE_SUPABASE_URL och " +
      "VITE_SUPABASE_PUBLISHABLE_KEY måste finnas i .env — backend-anrop kommer att misslyckas."
  );
}

/** True for browser-level network failures (no HTTP response: DNS down, host
 * unreachable, CORS-preflight blocked). These surface as a bare TypeError and
 * mean the request never reached the backend at all. */
function isNetworkError(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /failed to fetch|networkerror|load failed|fetch failed|failed to send a request/i.test(msg);
}

/**
 * Turn an opaque backend failure into an actionable, user-facing message and a
 * precise console diagnostic. A bare "Failed to fetch" is NOT CORS or a 4xx —
 * the browser never reached the host. Most often the Supabase project is
 * paused/deleted or VITE_SUPABASE_URL points at the wrong project.
 */
function describeBackendError(context: string, err: unknown): Error {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  if (isNetworkError(err)) {
    console.error(
      `[scan-service] ${context}: kunde inte nå Supabase-backend.\n` +
        `  URL: ${SUPABASE_URL ?? "(VITE_SUPABASE_URL saknas!)"}\n` +
        `  Nätverks-/DNS-fel — ingen HTTP-status, ingen CORS. Projektet är ` +
        `troligen pausat/raderat, eller så pekar URL:en på fel projekt.`,
      err
    );
    return new Error("Kan inte nå analystjänsten just nu (backend svarar inte). Försök igen om en stund.");
  }
  console.error(`[scan-service] ${context}:`, err);
  return new Error(`${context}: ${raw}`);
}

export interface NearbyCompetitor {
  name: string;
  domain: string;
  url: string;
  strength: string;
  has_reviews?: boolean;
}

export interface GoogleBusinessData {
  found: boolean;
  rating: number | null;
  reviewCount: number | null;
  businessName: string | null;
  category: string | null;
}

export interface CategoryScores {
  seo: number;
  conversion: number;
  trust: number;
  performance: number;
  security: number;
}

export interface AuditCheck {
  id: string;
  label: string;
  category: "seo" | "conversion" | "trust" | "performance" | "security";
  passed: boolean;
  detail: string;
  impact: "high" | "medium" | "low";
}

export interface PageSpeedData {
  score: number;
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  speedIndex: number | null;
  interactive: number | null;
}

export interface PageInfo {
  title: string;
  metaDesc: string;
  h1: string;
  wordCount: number;
  imgCount: number;
  screenshotUrl?: string;
  ctaCount?: number;
  sectionCount?: number;
  trustSignalCount?: number;
  estimatedLoadTimeMs?: number;
}

export interface ScanResult {
  scanId: string;
  score: number;
  summary: string;
  categoryScores: CategoryScores;
  biggestProblem?: string;
  weaknesses: string[];
  strengths: string[];
  opportunity: string;
  businessImpact?: string[];
  quickFix?: string;
  industry?: string;
  businessSummary?: string;
  nearbyCompetitors?: NearbyCompetitor[];
  auditChecks?: AuditCheck[];
  pageInfo?: PageInfo;
  pageSpeed?: PageSpeedData | null;
  /** Full deterministic score breakdown (category scores, checks, points). */
  scoreBreakdown?: ScoreBreakdown;
  /** True when this result reused the cached per-domain measurement (stable score). */
  cached?: boolean;
  /** ISO time the underlying measurement was taken (backend cache). */
  measuredAt?: string;
  /** ISO time the cached measurement expires. */
  expiresAt?: string | null;
  analysisVersion?: string;
  scoringVersion?: string;
  /** True when a forced refresh was denied by the backend rate limit. */
  refreshRateLimited?: boolean;
  /** Compact signal context handed back to the deferred summary step (internal). */
  promptContext?: Record<string, unknown>;
}

/** The AI-generated text fields, filled in AFTER the score is shown. */
export interface SummaryResult {
  summary: string;
  biggestProblem?: string;
  weaknesses: string[];
  strengths: string[];
  opportunity: string;
  businessImpact?: string[];
  quickFix?: string;
  industry?: string;
  businessSummary?: string;
}

export async function createScan(rawDomain: string): Promise<string> {
  const normalized = normalizeDomain(rawDomain);
  try {
    const { data, error } = await supabase
      .from("scans")
      .insert({ domain: rawDomain, normalized_domain: normalized, status: "queued" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  } catch (err) {
    throw describeBackendError("Kunde inte skapa analys", err);
  }
}

/** Fetch a quick screenshot of the domain via Firecrawl scrape */
export async function fetchScreenshot(domain: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("screenshot-website", {
      body: { domain },
    });
    if (error || !data?.screenshotUrl) return null;
    return data.screenshotUrl;
  } catch {
    return null;
  }
}

/** Fetch Google Business Profile data */
export async function fetchGoogleBusiness(domain: string): Promise<GoogleBusinessData> {
  try {
    const { data, error } = await supabase.functions.invoke("google-business-lookup", {
      body: { domain },
    });
    if (error || !data) return { found: false, rating: null, reviewCount: null, businessName: null, category: null };
    return data;
  } catch {
    return { found: false, rating: null, reviewCount: null, businessName: null, category: null };
  }
}

/**
 * Score phase — fast. Returns the BETYG (score + category scores + checks +
 * PageSpeed) as soon as crawl + PageSpeed + checks are done. The AI summary and
 * competitors are fetched separately afterwards (see generateSummary /
 * fetchRealCompetitors) and never block the score.
 */
/** Raw measurement payload the backend returns (crawled checks + PSI + cache meta). */
interface RawAnalysis {
  scanId: string;
  auditChecks?: AuditCheck[];
  pageInfo?: PageInfo;
  pageSpeed?: PageSpeedData | null;
  promptContext?: Record<string, unknown>;
  cached?: boolean;
  measuredAt?: string;
  expiresAt?: string | null;
  analysisVersion?: string;
  scoringVersion?: string;
  refreshRateLimited?: boolean;
  error?: string;
}

/**
 * The authoritative per-domain measurement cache now lives in the BACKEND
 * (Supabase `analysis_cache`), so every browser/session sees the same
 * measurement and score. This tiny client map only collapses *duplicate clicks*
 * within the same session — if a request for the same domain is already in
 * flight, the second click reuses it. It is NOT a source of truth and holds no
 * data past the in-flight promise.
 */
const inFlight = new Map<string, Promise<ScanResult>>();

/** Drop any in-flight dedup entries (e.g. on reset). */
export function clearAnalysisCache() {
  inFlight.clear();
}

export async function runAnalysis(
  scanId: string,
  domain: string,
  opts?: { forceRefresh?: boolean },
): Promise<ScanResult> {
  const key = normalizeDomain(domain);
  // Duplicate-click dedup (session-only); never applied to a forced refresh.
  if (!opts?.forceRefresh) {
    const pending = inFlight.get(key);
    if (pending) return pending;
  }

  const run = (async (): Promise<ScanResult> => {
    let data: RawAnalysis;
    let error;
    try {
      ({ data, error } = await supabase.functions.invoke("analyze-website", {
        body: { scanId, domain, forceRefresh: opts?.forceRefresh || undefined },
      }));
    } catch (err) {
      throw describeBackendError("Analysen misslyckades", err);
    }
    if (error) throw describeBackendError("Analysen misslyckades", error);
    if (data?.error) throw new Error(data.error);

    // The score is computed here by the deterministic engine from the measured
    // checks + PageSpeed — never the backend's blended number, never AI.
    const checks: AuditCheck[] = data.auditChecks ?? [];
    const breakdown = computeScore({ checks, pageSpeed: data.pageSpeed ?? null });
    const findings = deriveFindings(breakdown);

    return {
      scanId: data.scanId,
      score: breakdown.total,
      summary: "",
      categoryScores: breakdown.categoryScores,
      scoreBreakdown: breakdown,
      cached: data.cached ?? false,
      measuredAt: data.measuredAt,
      expiresAt: data.expiresAt ?? null,
      analysisVersion: data.analysisVersion,
      scoringVersion: data.scoringVersion,
      refreshRateLimited: data.refreshRateLimited ?? false,
      // Deterministic, measurement-based findings — the facts the AI later phrases.
      weaknesses: findings.weaknesses,
      strengths: findings.strengths,
      opportunity: findings.opportunity,
      nearbyCompetitors: undefined,
      auditChecks: data.auditChecks,
      pageInfo: data.pageInfo,
      pageSpeed: data.pageSpeed || null,
      promptContext: data.promptContext,
    };
  })();

  if (!opts?.forceRefresh) {
    inFlight.set(key, run);
    run.finally(() => {
      if (inFlight.get(key) === run) inFlight.delete(key);
    });
  }
  return run;
}

/**
 * Summary phase — deferred, non-blocking. Generates the AI commentary from the
 * compact context the score phase already returned (no re-crawl). Falls back to
 * a templated summary server-side; never affects the score.
 */
export async function generateSummary(result: ScanResult, domain: string): Promise<SummaryResult> {
  const { data, error } = await supabase.functions.invoke("analyze-website", {
    body: {
      phase: "summary",
      scanId: result.scanId,
      domain,
      promptContext: result.promptContext,
      scores: { ...result.categoryScores, total: result.score },
      checks: result.auditChecks,
    },
  });
  if (error) throw new Error(error.message || "Summary failed");
  if (data?.error) throw new Error(data.error);
  return {
    summary: data.summary || "",
    biggestProblem: data.biggestProblem,
    weaknesses: data.weaknesses || [],
    strengths: data.strengths || [],
    opportunity: data.opportunity || "",
    businessImpact: data.businessImpact,
    quickFix: data.quickFix,
    industry: data.industry,
    businessSummary: data.businessSummary,
  };
}

/** Fetch real competitors via Firecrawl search + quick scrape */
export async function fetchRealCompetitors(
  domain: string,
  industry?: string,
  userScore?: number
): Promise<NearbyCompetitor[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("find-competitors", {
      body: { domain, industry, city: "", userScore },
    });
    if (error || !data?.competitors?.length) return null;
    return data.competitors;
  } catch {
    return null;
  }
}

export async function submitLead(leadData: {
  name: string;
  email: string;
  company?: string;
  scanId?: string;
  domain?: string;
  totalScore?: number;
  visibilityGap?: number;
  estimatedLoss?: string;
  analysisSummary?: string;
  biggestProblem?: string;
  industry?: string;
  leadStatus?: string;
}): Promise<string> {
  const { data, error } = await supabase.from("leads").insert({
    name: leadData.name,
    email: leadData.email,
    company: leadData.company || null,
    scan_id: leadData.scanId || null,
    domain: leadData.domain || null,
    total_score: leadData.totalScore || null,
    visibility_gap: leadData.visibilityGap || null,
    estimated_loss: leadData.estimatedLoss || null,
    analysis_summary: leadData.analysisSummary || null,
    biggest_problem: leadData.biggestProblem || null,
    industry: leadData.industry || null,
    status: "new",
    lead_status: leadData.leadStatus || "new",
  }).select("id").single();
  if (error) throw new Error(`Failed to submit: ${error.message}`);
  return data.id;
}
