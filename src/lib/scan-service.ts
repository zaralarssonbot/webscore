import { supabase } from "@/integrations/supabase/client";
import { normalizeDomain } from "./domain";

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
  const { data, error } = await supabase
    .from("scans")
    .insert({ domain: rawDomain, normalized_domain: normalized, status: "queued" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create scan: ${error.message}`);
  return data.id;
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
export async function runAnalysis(scanId: string, domain: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke("analyze-website", {
    body: { scanId, domain },
  });
  if (error) throw new Error(error.message || "Analysis failed");
  if (data?.error) throw new Error(data.error);

  return {
    scanId: data.scanId,
    score: data.score,
    summary: "",
    categoryScores: data.categoryScores || { seo: 60, conversion: 60, trust: 60, performance: 60, security: 60 },
    weaknesses: [],
    strengths: [],
    opportunity: "",
    nearbyCompetitors: undefined,
    auditChecks: data.auditChecks,
    pageInfo: data.pageInfo,
    pageSpeed: data.pageSpeed || null,
    promptContext: data.promptContext,
  };
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
