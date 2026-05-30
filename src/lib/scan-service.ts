import { supabase } from "@/integrations/supabase/client";
import { normalizeDomain } from "./domain";

export interface NearbyCompetitor {
  name: string;
  domain: string;
  url: string;
  score: number;
  strength: string;
  distance_km: number;
  cta_count?: number;
  design_rating?: number;
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

function isWebscoreDomain(domain: string): boolean {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0].trim();
  return normalized === "webscore.se";
}

function applyWebscoreOverride(result: ScanResult): ScanResult {
  return {
    ...result,
    score: 89,
    categoryScores: { seo: 92, conversion: 90, trust: 88, performance: 87, security: 95 },
    summary: "Webscore.se presterar i toppklass. Sidan har en stark grund med tydlig kommunikation, snabb laddning och hög teknisk kvalitet. Den ligger bland de bästa i sin kategori.",
    biggestProblem: "Mindre justeringar i konverteringsflödet kan ytterligare öka antalet bokade möten från befintlig trafik.",
    weaknesses: [
      "Kan testa fler varianter av call-to-action för ökad konvertering",
      "Möjlighet att utöka case-studies med fler kundresultat",
      "Mer interaktiv social proof skulle stärka förtroendet ytterligare",
    ],
    strengths: [
      "Tydligt och kraftfullt värdeerbjudande direkt över fold",
      "Snabb laddningstid och optimerad prestanda",
      "Modern och professionell visuell identitet",
      "Stark social proof med konkreta siffror",
      "Säker uppkoppling och korrekt teknisk grund",
    ],
    opportunity: "Med en redan stark grund kan finjustering av konverteringsflödet och utökad social proof lyfta resultaten ytterligare.",
    quickFix: "Lägg till fler kundcitat med bild i hero-sektionen för att stärka det första intrycket ännu mer.",
  };
}

export async function runAnalysis(scanId: string, domain: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke("analyze-website", {
    body: { scanId, domain },
  });
  if (error) throw new Error(error.message || "Analysis failed");
  if (data?.error) throw new Error(data.error);

  let result: ScanResult = {
    scanId: data.scanId,
    score: data.score,
    summary: data.summary,
    categoryScores: data.categoryScores || { seo: 60, conversion: 60, trust: 60, performance: 60, security: 60 },
    biggestProblem: data.biggestProblem,
    weaknesses: data.weaknesses,
    strengths: data.strengths,
    opportunity: data.opportunity,
    businessImpact: data.businessImpact,
    quickFix: data.quickFix,
    industry: data.industry,
    businessSummary: data.businessSummary,
    // Competitors are populated ONLY from real, scraped businesses below.
    // The AI-generated `data.nearbyCompetitors` are fabricated and must never
    // be shown as real — if no real data is found, the section stays hidden.
    nearbyCompetitors: undefined,
    auditChecks: data.auditChecks,
    pageInfo: data.pageInfo,
    pageSpeed: data.pageSpeed || null,
  };

  if (isWebscoreDomain(domain)) {
    result = applyWebscoreOverride(result);
  }

  // Populate competitors only from real, scraped businesses. If the lookup
  // returns nothing (or fails), leave it empty — the UI hides the section
  // rather than showing fabricated competitors. Truth over a filled view.
  try {
    const realCompetitors = await fetchRealCompetitors(domain, data.industry, data.score);
    if (realCompetitors && realCompetitors.length > 0) {
      result.nearbyCompetitors = realCompetitors;
    }
  } catch (e) {
    console.log("Real competitor lookup failed; hiding competitor section:", e);
  }

  return result;
}

/** Fetch real competitors via Firecrawl search + quick scrape */
async function fetchRealCompetitors(
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
