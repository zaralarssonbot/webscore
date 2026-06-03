import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildFallbackAudit } from "./fallback.ts";

// AI model used for the text commentary. Change here to swap models later.
const GEMINI_MODEL = "gemini-2.5-flash";
// Google's OpenAI-compatible endpoint — lets us keep the existing
// chat/completions + function-calling (website_audit) request shape.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──────────────────────────────────────────────────────────
interface SiteSignals {
  url: string;
  title: string;
  metaDesc: string;
  h1: string;
  h2s: string[];
  hasSSL: boolean;
  hasViewport: boolean;
  hasOgTags: boolean;
  hasCanonical: boolean;
  hasFavicon: boolean;
  hasStructuredData: boolean;
  hasAnalytics: boolean;
  hasCTA: boolean;
  ctaCount: number;
  sectionCount: number;
  trustSignalCount: number;
  estimatedLoadTimeMs: number;
  formCount: number;
  imgCount: number;
  imgAltCount: number;
  hasLazyLoad: boolean;
  scriptCount: number;
  cssCount: number;
  hasHreflang: boolean;
  hasSitemap: boolean;
  hasRobotsMeta: boolean;
  hasPhoneLink: boolean;
  hasEmailLink: boolean;
  hasAddress: boolean;
  hasSocialLinks: boolean;
  hasTestimonials: boolean;
  hasCookieConsent: boolean;
  htmlSizeKB: number;
  textContentPreview: string;
  fetchFailed?: boolean;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasResponsiveImages: boolean;
  wordCount: number;
  hasVideo: boolean;
  hasMap: boolean;
  hasOpeningHours: boolean;
  hasPricing: boolean;
  hasPrivacyPolicy: boolean;
  hasAccessibilityFeatures: boolean;
  pageTitle: string;
  screenshotUrl?: string;
}

interface AuditCheck {
  id: string;
  label: string;
  category: "seo" | "conversion" | "trust" | "performance" | "security";
  passed: boolean;
  detail: string;
  impact: "high" | "medium" | "low";
}

interface CategoryScores {
  seo: number;
  conversion: number;
  trust: number;
  performance: number;
  security: number;
}

// ── PageSpeed Insights ─────────────────────────────────────────────
interface PageSpeedData {
  performanceScore: number | null;       // 0-100
  fcp: number | null;                    // First Contentful Paint (ms)
  lcp: number | null;                    // Largest Contentful Paint (ms)
  tbt: number | null;                    // Total Blocking Time (ms)
  cls: number | null;                    // Cumulative Layout Shift
  speedIndex: number | null;             // Speed Index (ms)
  interactive: number | null;            // Time to Interactive (ms)
  mobileFriendly: boolean | null;
  fetchError?: string;
}

async function fetchPageSpeedInsights(domain: string): Promise<PageSpeedData> {
  const empty: PageSpeedData = {
    performanceScore: null, fcp: null, lcp: null, tbt: null,
    cls: null, speedIndex: null, interactive: null, mobileFriendly: null,
  };
  try {
    const url = encodeURIComponent(`https://${domain}`);
    // A PAGESPEED_API_KEY lifts the anonymous per-day quota (keyless calls get
    // 429). When it's absent we still call keyless and fall back to heuristics.
    const psiKey = Deno.env.get("PAGESPEED_API_KEY");
    const keyParam = psiKey ? `&key=${psiKey}` : "";
    // Mobile + performance ONLY. We never read the accessibility category, and
    // requesting it makes Lighthouse run extra audits server-side (slower). The
    // performance category still returns the real LCP/FCP/TBT/CLS/SpeedIndex.
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&category=performance${keyParam}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("PSI error:", resp.status, errText);
      return { ...empty, fetchError: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const lhr = data.lighthouseResult;
    if (!lhr) return { ...empty, fetchError: "No lighthouse result" };

    const audits = lhr.audits || {};
    const perfScore = lhr.categories?.performance?.score;

    return {
      performanceScore: perfScore != null ? Math.round(perfScore * 100) : null,
      fcp: audits["first-contentful-paint"]?.numericValue ?? null,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      speedIndex: audits["speed-index"]?.numericValue ?? null,
      interactive: audits["interactive"]?.numericValue ?? null,
      mobileFriendly: data.loadingExperience?.overall_category !== "SLOW",
    };
  } catch (e) {
    console.error("PSI fetch failed:", e);
    return { ...empty, fetchError: e instanceof Error ? e.message : "Unknown" };
  }
}

// ── Crawl with Firecrawl ───────────────────────────────────────────
async function crawlWithFirecrawl(domain: string): Promise<{ html: string; markdown: string; metadata: Record<string, unknown>; screenshotUrl?: string; fetchTimeMs: number } | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;

  try {
    const url = `https://${domain}`;
    const startTime = Date.now();
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Only the formats the checks actually use: rendered HTML (+ parsed
        // <head> metadata, always returned) and the screenshot. Dropping the
        // unused markdown/links formats cuts Firecrawl's per-request work.
        url,
        formats: ["html", "screenshot"],
        onlyMainContent: false,
        // Enough for JS-rendered content to settle without over-waiting.
        waitFor: 2000,
      }),
    });
    const fetchTimeMs = Date.now() - startTime;

    if (!resp.ok) {
      console.error("Firecrawl error:", resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    return {
      html: data.data?.html || data.html || "",
      markdown: data.data?.markdown || data.markdown || "",
      metadata: data.data?.metadata || data.metadata || {},
      screenshotUrl: data.data?.screenshot || data.screenshot,
      fetchTimeMs,
    };
  } catch (e) {
    console.error("Firecrawl fetch failed:", e);
    return null;
  }
}

// ── Fallback crawl ─────────────────────────────────────────────────
async function fallbackCrawl(domain: string): Promise<{ html: string; fetchTimeMs: number }> {
  const urls = [`https://${domain}`, `http://${domain}`];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const startTime = Date.now();
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WebsiteAuditBot/1.0)", Accept: "text/html" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      const fetchTimeMs = Date.now() - startTime;
      if (!resp.ok) continue;
      return { html: await resp.text(), fetchTimeMs };
    } catch { continue; }
  }
  return { html: "", fetchTimeMs: 0 };
}

// ── Real SSL/HTTPS probe ───────────────────────────────────────────
// Returns true only if a TLS handshake to https://<domain> actually
// succeeds. A network/cert failure (no HTTPS) throws → false.
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
    // Any HTTP response means the TLS handshake succeeded.
    return resp.status > 0;
  } catch {
    return false;
  }
}

// ── Extract signals from HTML ──────────────────────────────────────
// `metadata` is Firecrawl's parsed <head> data (title, description, og*,
// viewport, robots…). It is the PRIMARY source for head signals because the
// raw `html` we receive is a *rendered* DOM where the real <head> is often
// stripped or its <title> shadowed by inline SVG sprite <title> elements.
// We fall back to a <head>-scoped, SVG-stripped regex only when metadata is
// missing (e.g. the plain-fetch fallback crawl, which has no metadata).
function extractSignals(
  html: string,
  domain: string,
  screenshotUrl?: string,
  fetchTimeMs = 0,
  metadata?: Record<string, unknown>,
  hasSSL = true,
): SiteSignals {
  const test = (re: RegExp) => re.test(html);
  const count = (re: RegExp) => (html.match(re) || []).length;

  // ── Head-scoped search space (ignores inline SVG <title> sprites) ──
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const headHtml = headMatch ? headMatch[0] : html;
  const headSearch = headHtml.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const headTest = (re: RegExp) => re.test(headSearch);

  // ── Metadata reader (tries several key spellings Firecrawl may use) ──
  const meta = metadata || {};
  const metaStr = (keys: string[]): string => {
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (Array.isArray(v) && v.length && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
    }
    return "";
  };
  const metaHas = (keys: string[]): boolean => keys.some((k) => {
    const v = meta[k];
    return (typeof v === "string" && v.trim().length > 0) || (Array.isArray(v) && v.length > 0);
  });

  // Title — metadata first, then head-scoped <title>, then og:title
  const headTitleMatch = headSearch.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const headTitle = headTitleMatch ? headTitleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
  const title = metaStr(["title", "ogTitle", "og:title"]) || headTitle;

  // Meta description — metadata first, then head-scoped regex
  const headMetaDescMatch =
    headSearch.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    headSearch.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDesc = metaStr(["description", "ogDescription", "og:description"]) ||
    (headMetaDescMatch ? headMetaDescMatch[1].trim() : "");

  // Head boolean signals — metadata first, then head-scoped regex
  const hasOgTags = metaHas(["ogTitle", "ogDescription", "ogImage", "ogSiteName", "ogUrl", "og:title", "og:description", "og:image"]) ||
    headTest(/<meta[^>]*property=["']og:/i);
  const hasCanonical = metaHas(["canonical"]) || headTest(/<link[^>]*rel=["']canonical["']/i);
  const hasViewport = metaHas(["viewport"]) || headTest(/<meta[^>]*name=["']viewport["']/i);
  const hasRobotsMeta = metaHas(["robots"]) || headTest(/<meta[^>]*name=["']robots["']/i);
  const hasFavicon = metaHas(["favicon"]) || headTest(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]*>/g, "").trim() : "";

  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .slice(0, 8)
    .map((m) => m[1].replace(/<[^>]*>/g, "").trim())
    .filter(Boolean);

  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const allLinks = count(/<a\s/gi);
  const internalLinks = (html.match(new RegExp(`href=["'][^"']*${domain.replace(/\./g, "\\.")}`, "gi")) || []).length;

  // CTA count
  const ctaRegex = /(?:kontakta|boka|köp|beställ|offert|gratis|ring|contact|book|buy|order|quote|free|call|get started|kom igång)/gi;
  const ctaCount = (html.match(ctaRegex) || []).length;

  // Section count
  const sectionCount = count(/<(?:section|article|main)\b/gi);

  // Trust signal count
  let trustSignalCount = 0;
  if (test(/(?:omdöme|recension|testimonial|review|betyg|stars|stjärnor)/i)) trustSignalCount++;
  if (test(/(?:certifierad|certified|iso\s?\d|ackrediterad)/i)) trustSignalCount++;
  if (test(/(?:garanti|guarantee|warranty)/i)) trustSignalCount++;
  if (test(/(?:facebook|instagram|linkedin|twitter|youtube|tiktok)\.com/i)) trustSignalCount++;
  if (test(/<img[^>]*(?:logo|partner|client|kund)/i)) trustSignalCount++;
  if (test(/(?:trustpilot|google.*review|yelp)/i)) trustSignalCount++;

  return {
    url: `https://${domain}`,
    title,
    pageTitle: title,
    metaDesc,
    h1,
    h2s,
    hasSSL,
    hasViewport,
    hasOgTags,
    hasCanonical,
    hasFavicon,
    hasStructuredData: test(/application\/ld\+json/i),
    hasAnalytics: test(/google-analytics|gtag|gtm|ga\(|_ga|analytics/i),
    hasCTA: ctaCount > 0,
    ctaCount,
    sectionCount,
    trustSignalCount,
    estimatedLoadTimeMs: fetchTimeMs,
    formCount: count(/<form/gi),
    imgCount: count(/<img/gi),
    imgAltCount: count(/<img[^>]*alt=["'][^"']+["']/gi),
    hasLazyLoad: test(/loading=["']lazy["']/i),
    scriptCount: count(/<script/gi),
    cssCount: count(/<link[^>]*stylesheet/gi),
    hasHreflang: test(/<link[^>]*hreflang/i),
    hasSitemap: test(/sitemap/i),
    hasRobotsMeta,
    hasPhoneLink: test(/tel:/i),
    hasEmailLink: test(/mailto:/i),
    hasAddress: test(/<address/i) || test(/(?:adress|gatan|vägen|torget|street|avenue)/i),
    hasSocialLinks: test(/(?:facebook|instagram|linkedin|twitter|youtube|tiktok)\.com/i),
    hasTestimonials: test(/(?:omdöme|recension|testimonial|kundsäger|kundröst|review|betyg|stars|stjärnor)/i),
    hasCookieConsent: test(/(?:cookie|gdpr|samtycke|consent|cookiebot|onetrust)/i),
    htmlSizeKB: Math.round(html.length / 1024),
    textContentPreview: textContent.slice(0, 4000),
    linkCount: allLinks,
    internalLinkCount: internalLinks,
    externalLinkCount: Math.max(0, allLinks - internalLinks),
    hasResponsiveImages: test(/srcset=/i) || test(/<picture/i),
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
    hasVideo: test(/<video/i) || test(/youtube\.com|vimeo\.com/i),
    hasMap: test(/google\.com\/maps|maps\.googleapis/i),
    hasOpeningHours: test(/öppettid|öppet|opening hours|business hours/i),
    hasPricing: test(/pris|kostnad|price|pricing|från\s*\d/i),
    hasPrivacyPolicy: test(/integritetspolicy|privacy policy|personuppgift|gdpr/i),
    hasAccessibilityFeatures: test(/aria-label|role=["']/i),
    screenshotUrl,
  };
}

// ── Deterministic audit checks ─────────────────────────────────────
function runAuditChecks(s: SiteSignals): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // SEO checks
  checks.push({ id: "title", label: "Sidtitel (title-tagg)", category: "seo", passed: !!s.title, detail: s.title ? `"${s.title.slice(0, 60)}"` : "Saknas helt – sökmotorer har inget att visa", impact: "high" });
  checks.push({ id: "meta_desc", label: "Meta-beskrivning", category: "seo", passed: !!s.metaDesc, detail: s.metaDesc ? `"${s.metaDesc.slice(0, 100)}..."` : "Saknas – Google genererar egen text istället", impact: "high" });
  checks.push({ id: "h1", label: "H1-rubrik", category: "seo", passed: !!s.h1, detail: s.h1 ? `"${s.h1.slice(0, 60)}"` : "Saknas – ingen tydlig huvudrubrik på sidan", impact: "high" });
  checks.push({ id: "h2s", label: "Underrubriker (H2)", category: "seo", passed: s.h2s.length >= 2, detail: s.h2s.length > 0 ? `${s.h2s.length} st hittade` : "Inga underrubriker – svag innehållsstruktur", impact: "medium" });
  checks.push({ id: "og_tags", label: "Open Graph-taggar", category: "seo", passed: s.hasOgTags, detail: s.hasOgTags ? "Finns – delning i sociala medier fungerar" : "Saknas – sociala delningar ser oprofessionella ut", impact: "medium" });
  checks.push({ id: "canonical", label: "Kanonisk URL", category: "seo", passed: s.hasCanonical, detail: s.hasCanonical ? "Finns – skyddar mot dubblerat innehåll" : "Saknas – risk för dubblerat innehåll i Google", impact: "medium" });
  checks.push({ id: "structured_data", label: "Strukturerad data (Schema.org)", category: "seo", passed: s.hasStructuredData, detail: s.hasStructuredData ? "Finns – sökmotorer förstår innehållet bättre" : "Saknas – går miste om rika sökresultat", impact: "medium" });
  checks.push({ id: "img_alt", label: "Bilder med alt-text", category: "seo", passed: s.imgCount > 0 && s.imgAltCount / s.imgCount >= 0.5, detail: s.imgCount > 0 ? `${s.imgAltCount} av ${s.imgCount} bilder har alt-text` : "Inga bilder hittade", impact: "medium" });
  checks.push({ id: "word_count", label: "Textinnehåll", category: "seo", passed: s.wordCount >= 300, detail: `${s.wordCount} ord – ${s.wordCount >= 300 ? "tillräckligt för SEO" : "för lite för att ranka bra"}`, impact: "high" });
  checks.push({ id: "analytics", label: "Webbanalys (Analytics)", category: "seo", passed: s.hasAnalytics, detail: s.hasAnalytics ? "Finns – besöksdata spåras" : "Saknas – ingen insikt i besökstrafik", impact: "low" });
  
  // NEW SEO checks
  const titleLen = s.title.length;
  checks.push({ id: "title_length", label: "Titellängd", category: "seo", passed: titleLen >= 30 && titleLen <= 65, detail: titleLen === 0 ? "Saknas" : `${titleLen} tecken – ${titleLen >= 30 && titleLen <= 65 ? "optimal längd (30-65)" : titleLen < 30 ? "för kort, bör vara 30-65 tecken" : "för lång, bör vara 30-65 tecken"}`, impact: "medium" });
  
  const metaLen = s.metaDesc.length;
  checks.push({ id: "meta_length", label: "Meta-beskrivningslängd", category: "seo", passed: metaLen >= 120 && metaLen <= 160, detail: metaLen === 0 ? "Saknas" : `${metaLen} tecken – ${metaLen >= 120 && metaLen <= 160 ? "optimal längd (120-160)" : metaLen < 120 ? "för kort, bör vara 120-160 tecken" : "för lång, kan klippas i sökresultat"}`, impact: "medium" });
  
  const linkDensity = s.wordCount > 0 ? s.internalLinkCount / s.wordCount * 1000 : 0;
  checks.push({ id: "internal_links", label: "Intern länkning", category: "seo", passed: s.internalLinkCount >= 3, detail: `${s.internalLinkCount} interna länkar – ${s.internalLinkCount >= 3 ? "bra intern länkstruktur" : "för få, sökmotorer har svårt att navigera sidan"}`, impact: "medium" });
  
  const hasH2AfterH1 = !!s.h1 && s.h2s.length > 0;
  checks.push({ id: "heading_hierarchy", label: "Rubrikhierarki (H1→H2)", category: "seo", passed: hasH2AfterH1, detail: hasH2AfterH1 ? "Korrekt – H1 följs av H2-underrubriker" : "Bruten hierarki – saknar tydlig H1→H2-struktur", impact: "low" });

  // Conversion checks
  checks.push({ id: "cta", label: "Call-to-action (CTA)", category: "conversion", passed: s.hasCTA, detail: s.hasCTA ? `${s.ctaCount} uppmaningar hittade` : "Inga tydliga uppmaningar att agera", impact: "high" });
  checks.push({ id: "cta_count", label: "Antal CTA:er", category: "conversion", passed: s.ctaCount >= 3, detail: `${s.ctaCount} CTA:er – ${s.ctaCount >= 3 ? "bra spridning av uppmaningar" : "för få, besökare behöver fler möjligheter att agera"}`, impact: "medium" });
  checks.push({ id: "forms", label: "Kontaktformulär", category: "conversion", passed: s.formCount >= 1, detail: s.formCount > 0 ? `${s.formCount} formulär hittade` : "Inget formulär – svårt för besökare att kontakta", impact: "high" });
  checks.push({ id: "phone", label: "Klickbart telefonnummer", category: "conversion", passed: s.hasPhoneLink, detail: s.hasPhoneLink ? "Finns – mobilanvändare kan ringa direkt" : "Saknas – mobilanvändare kan inte ringa med ett klick", impact: "high" });
  checks.push({ id: "email", label: "Klickbar e-postlänk", category: "conversion", passed: s.hasEmailLink, detail: s.hasEmailLink ? "Finns – snabb kontaktväg" : "Saknas – ingen direkt e-postkontakt", impact: "medium" });
  checks.push({ id: "pricing", label: "Prisinformation", category: "conversion", passed: s.hasPricing, detail: s.hasPricing ? "Prisinformation hittad" : "Saknas – besökare vet inte vad det kostar", impact: "medium" });
  checks.push({ id: "sections", label: "Sidstruktur (sektioner)", category: "conversion", passed: s.sectionCount >= 3, detail: `${s.sectionCount} sektioner – ${s.sectionCount >= 3 ? "välstrukturerad sida" : "för få sektioner, sidan kan upplevas tunn"}`, impact: "low" });

  // Trust checks
  checks.push({ id: "ssl", label: "SSL-certifikat (HTTPS)", category: "trust", passed: s.hasSSL, detail: s.hasSSL ? "Aktiv – sidan är krypterad" : "Saknas – besökare ser 'Ej säker' i webbläsaren", impact: "high" });
  checks.push({ id: "social", label: "Sociala medier-länkar", category: "trust", passed: s.hasSocialLinks, detail: s.hasSocialLinks ? "Hittade länkar till sociala medier" : "Inga sociala medier-länkar", impact: "medium" });
  checks.push({ id: "testimonials", label: "Omdömen / recensioner", category: "trust", passed: s.hasTestimonials, detail: s.hasTestimonials ? "Hittade sociala bevis" : "Saknas – inga omdömen bygger förtroende", impact: "high" });
  checks.push({ id: "address", label: "Fysisk adress", category: "trust", passed: s.hasAddress, detail: s.hasAddress ? "Adressinformation hittad" : "Saknas – verkar inte ha fysisk närvaro", impact: "medium" });
  checks.push({ id: "favicon", label: "Favicon / webbplatsikon", category: "trust", passed: s.hasFavicon, detail: s.hasFavicon ? "Finns – professionellt intryck i webbläsarfliken" : "Saknas – generisk flik i webbläsaren", impact: "low" });
  checks.push({ id: "privacy", label: "Integritetspolicy", category: "trust", passed: s.hasPrivacyPolicy, detail: s.hasPrivacyPolicy ? "Finns – GDPR-medvetenhet" : "Saknas – lagkrav som inte uppfylls", impact: "medium" });
  checks.push({ id: "trust_signals", label: "Förtroendesignaler", category: "trust", passed: s.trustSignalCount >= 3, detail: `${s.trustSignalCount} förtroendesignaler – ${s.trustSignalCount >= 3 ? "bra mängd sociala bevis" : "för få, besökare saknar trygghet"}`, impact: "medium" });

  // Performance checks
  checks.push({ id: "page_size", label: "Sidstorlek", category: "performance", passed: s.htmlSizeKB < 150, detail: `${s.htmlSizeKB} KB – ${s.htmlSizeKB < 150 ? "bra storlek" : "för stor, påverkar laddtid"}`, impact: "medium" });
  checks.push({ id: "scripts", label: "Antal skript", category: "performance", passed: s.scriptCount <= 10, detail: `${s.scriptCount} skript – ${s.scriptCount <= 10 ? "rimligt antal" : "för många, gör sidan långsammare"}`, impact: "medium" });
  checks.push({ id: "viewport", label: "Mobilanpassning (viewport)", category: "performance", passed: s.hasViewport, detail: s.hasViewport ? "Sidan är mobilanpassad" : "Saknas – sidan fungerar dåligt på mobiler", impact: "high" });
  checks.push({ id: "lazy_load", label: "Lazy loading av bilder", category: "performance", passed: s.hasLazyLoad || s.imgCount <= 3, detail: s.hasLazyLoad ? "Aktivt – bilder laddas smart" : s.imgCount <= 3 ? "Få bilder, inte nödvändigt" : "Saknas – alla bilder laddas samtidigt", impact: "low" });
  checks.push({ id: "responsive_img", label: "Responsiva bilder", category: "performance", passed: s.hasResponsiveImages, detail: s.hasResponsiveImages ? "Srcset/picture används" : "Saknas – samma bildstorlek oavsett enhet", impact: "low" });
  
  const loadSec = (s.estimatedLoadTimeMs / 1000).toFixed(1);
  checks.push({ id: "load_time", label: "Uppskattad laddtid", category: "performance", passed: s.estimatedLoadTimeMs > 0 && s.estimatedLoadTimeMs < 5000, detail: s.estimatedLoadTimeMs > 0 ? `~${loadSec}s – ${s.estimatedLoadTimeMs < 5000 ? "acceptabel" : "långsamt, besökare tappar tålamodet"}` : "Kunde inte mäta", impact: "high" });

  // Security checks
  checks.push({ id: "https", label: "HTTPS-kryptering", category: "security", passed: s.hasSSL, detail: s.hasSSL ? "Aktiv kryptering" : "Saknas – all data skickas okrypterat", impact: "high" });
  checks.push({ id: "cookie_consent", label: "Cookie-samtycke / GDPR", category: "security", passed: s.hasCookieConsent, detail: s.hasCookieConsent ? "Finns – uppfyller lagkrav" : "Saknas – potentiellt lagbrott", impact: "high" });
  checks.push({ id: "robots", label: "Robots meta-tagg", category: "security", passed: s.hasRobotsMeta, detail: s.hasRobotsMeta ? "Finns – kontroll över indexering" : "Saknas – ingen kontroll över vad sökmotorer indexerar", impact: "low" });

  return checks;
}

// ── Deterministic scoring ──────────────────────────────────────────
function clamp(v: number, min = 40, max = 95) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function calculateScores(checks: AuditCheck[]): { seo: number; conversion: number; trust: number; performance: number; security: number; total: number } {
  const catScores: Record<string, number> = { seo: 40, conversion: 40, trust: 40, performance: 70, security: 40 };
  const impactPoints: Record<string, number> = { high: 12, medium: 7, low: 4 };

  for (const check of checks) {
    if (check.passed) {
      catScores[check.category] += impactPoints[check.impact];
    }
  }

  const scores = {
    seo: clamp(catScores.seo),
    conversion: clamp(catScores.conversion),
    trust: clamp(catScores.trust),
    performance: clamp(catScores.performance),
    security: clamp(catScores.security),
    total: 0,
  };

  scores.total = clamp(
    scores.seo * 0.25 + scores.conversion * 0.25 + scores.trust * 0.2 + scores.performance * 0.15 + scores.security * 0.15
  );

  return scores;
}

// ── AI prompt (text only) ──────────────────────────────────────────
// Only the signal fields the prompt actually reads. This compact shape is what
// the score phase returns to the client and the client hands back to the
// summary phase — so the (deferred) AI step never has to re-crawl the site.
type PromptSignals = Pick<SiteSignals,
  "title" | "metaDesc" | "h1" | "h2s" | "wordCount" | "imgCount" | "imgAltCount" |
  "ctaCount" | "sectionCount" | "trustSignalCount" | "estimatedLoadTimeMs" | "textContentPreview">;

function buildPrompt(domain: string, signals: PromptSignals, scores: CategoryScores & { total: number }, checks: AuditCheck[]) {
  const passedChecks = checks.filter((c) => c.passed).map((c) => `✅ ${c.label}: ${c.detail}`);
  const failedChecks = checks.filter((c) => !c.passed).map((c) => `❌ ${c.label}: ${c.detail}`);

  const system = `Du är en AI som analyserar företagshemsidor och förklarar prestanda i enkelt affärsspråk.

Ditt mål är att hjälpa en företagare förstå:
- Hur bra deras hemsida presterar
- Vad som håller den tillbaka
- Hur det påverkar deras förmåga att få kunder
- Hur den kan förbättras

Du får INTE använda teknisk jargong.
Allt måste vara lätt att förstå inom sekunder.

BETYGEN ÄR REDAN BERÄKNADE OCH FASTA – du får INTE ändra dem:
- SEO & Synlighet: ${scores.seo}/100
- Konvertering: ${scores.conversion}/100
- Förtroende: ${scores.trust}/100
- Prestanda: ${scores.performance}/100
- Säkerhet: ${scores.security}/100
- Totalbetyg: ${scores.total}/100

TONREGLER:
- Tydlig
- Modern
- Professionell
- Något direkt men aldrig hård
- Affärsfokuserad

VIKTIGT – Anpassa tonen baserat på betyg:
${scores.total >= 85 ? "Betyget är HÖGT (85–100): Var mest positiv, nämn små förbättringar." : scores.total >= 55 ? "Betyget är MEDEL (55–84): Var balanserad men lyft verkliga problem." : "Betyget är LÅGT (0–54): Förklara tydligt problemen, visa att det begränsar kundtillväxten."}

SPRÅKEXEMPEL:
Istället för: "SEO-problem upptäckta" → Säg: "Du är svårare att hitta på Google än du borde vara"
Istället för: "Låg konverteringsgrad" → Säg: "Besökare är mindre benägna att kontakta dig"
Istället för: "Saknar meta-beskrivning" → Säg: "Google vet inte hur det ska beskriva din sida för sökare"

MÅL: Få användaren att förstå att en bättre hemsida = mer synlighet, mer förtroende och fler kunder.

KONKURRENTER:
- Generera 3-5 realistiska konkurrenter i SAMMA bransch och SAMMA geografiska område (inom 5 km radie).
- Varje konkurrent MÅSTE ha en riktig, fungerande domän (t.ex. klinika.se) och full URL (https://klinika.se).
- Ange avstånd i km (0.5-5.0) från den analyserade sidan till varje konkurrent.
- Konkurrenterna ska ha högre betyg (70-95) och en kort förklaring till varför de presterar bättre.
- För varje konkurrent, ange:
  - cta_count: Uppskattat antal CTA:er (1-10)
  - design_rating: Designkvalitet (1-5)
  - has_reviews: Om de har synliga omdömen (true/false)`;

  const user = `Analysera: ${domain}

Sidtitel: "${signals.title}"
Meta-beskrivning: "${signals.metaDesc}"
H1: "${signals.h1}"
H2:er: ${signals.h2s.join(", ") || "Inga"}
Antal ord: ${signals.wordCount}
Antal bilder: ${signals.imgCount} (${signals.imgAltCount} med alt-text)
Antal CTA:er: ${signals.ctaCount}
Antal sektioner: ${signals.sectionCount}
Förtroendesignaler: ${signals.trustSignalCount}
Uppskattad laddtid: ${signals.estimatedLoadTimeMs}ms

GODKÄNDA kontroller:
${passedChecks.join("\n")}

UNDERKÄNDA kontroller:
${failedChecks.join("\n")}

Textutdrag: "${signals.textContentPreview.slice(0, 1500)}"

Baserat på dessa verkliga fynd, skriv en analys som förklarar vad detta betyder för företaget i affärstermer. Anropa "website_audit". Alla textfält på svenska.`;

  return { system, user };
}

const auditTool = {
  type: "function" as const,
  function: {
    name: "website_audit",
    description: "Return text commentary for a website audit based on real audit data",
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string", description: "Identifierad bransch. På svenska." },
        business_summary: { type: "string", description: "Vad företaget gör, beskriv det kort och tydligt. På svenska." },
        overall_summary: { type: "string", description: "2-3 meningar som förklarar totalbetyget baserat på de konkreta fynden. Affärsspråk. På svenska." },
        biggest_problem: { type: "string", description: "Det STÖRSTA enskilda problemet med hemsidan, förklarat i affärstermer. Kort och tydligt. På svenska." },
        weaknesses: {
          type: "array", items: { type: "string" },
          description: "3-5 svagheter – referera till specifika underkända kontroller. Affärsspråk. På svenska.",
        },
        strengths: {
          type: "array", items: { type: "string" },
          description: "2-4 styrkor – referera till specifika godkända kontroller. Affärsspråk. På svenska.",
        },
        business_impact: {
          type: "array", items: { type: "string" },
          description: "3 korta meningar som förklarar hur hemsidans brister påverkar företagets förmåga att få kunder. Exempel: 'Du är svårare att hitta på Google än du borde vara'. På svenska.",
        },
        biggest_opportunity: {
          type: "string",
          description: "Viktigaste förbättringen baserat på de underkända kontrollerna med högst impact. Förklara affärsnyttan. På svenska.",
        },
        quick_fix: {
          type: "string",
          description: "ETT konkret, enkelt åtgärdsförslag som företaget kan göra direkt för att förbättra sin hemsida. På svenska.",
        },
        nearby_competitors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Företagsnamn" },
              domain: { type: "string", description: "Domännamn, t.ex. klinika.se" },
              url: { type: "string", description: "Full URL med https://, t.ex. https://klinika.se" },
              score: { type: "integer", description: "70-95, högre än analyserad sida" },
              strength: { type: "string", description: "Kort förklaring varför de presterar bättre. På svenska." },
              distance_km: { type: "number", description: "Avstånd i km från analyserad sida, mellan 0.5 och 5.0. Max 5km radie." },
              cta_count: { type: "integer", description: "Uppskattat antal CTA:er på deras sida (1-10)" },
              design_rating: { type: "integer", description: "Designkvalitet 1-5 (5 = bäst)" },
              has_reviews: { type: "boolean", description: "Om de har synliga omdömen/recensioner" },
            },
            required: ["name", "domain", "url", "score", "strength", "distance_km", "cta_count", "design_rating", "has_reviews"],
            additionalProperties: false,
          },
          description: "3-5 realistiska konkurrenter i samma bransch INOM 5 km radie. Inkludera URL, avstånd, CTA-antal, designbetyg och omdömen. På svenska.",
        },
      },
      required: ["industry", "business_summary", "overall_summary", "biggest_problem", "weaknesses", "strengths", "business_impact", "biggest_opportunity", "quick_fix", "nearby_competitors"],
      additionalProperties: false,
    },
  },
};

// ── AI commentary via Google Gemini (OpenAI-compatible endpoint) ───
// Throws on any failure (missing key, non-2xx, timeout, no tool call) so the
// caller can fall back to a templated summary without failing the analysis.
async function generateGeminiAudit(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  // Free-tier Gemini returns 429 (rate/quota) intermittently. Retry with a
  // short backoff so a transient 429 doesn't stall the summary — the caller
  // still falls back to a templated summary if all attempts fail.
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
          tools: [auditTool],
          tool_choice: { type: "function", function: { name: "website_audit" } },
        }),
      });
    } catch (e) {
      lastErr = e;
      clearTimeout(timeout);
      continue; // network/timeout — retry
    }
    clearTimeout(timeout);

    if (response.status === 429 || response.status === 503) {
      // Honour Retry-After when present, else exponential-ish backoff.
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

// ── Handler ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { scanId, domain, phase } = body;
    if (!domain) {
      return new Response(JSON.stringify({ error: "domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── PHASE: SUMMARY ──────────────────────────────────────────────
    // Deferred, non-blocking AI text step. Receives the compact promptContext +
    // scores + checks the score phase already computed, so it never re-crawls.
    // The score is NOT recomputed here and is never affected by this step.
    if (phase === "summary") {
      const { promptContext, scores, checks } = body as {
        promptContext: PromptSignals; scores: CategoryScores & { total: number }; checks: AuditCheck[];
      };
      if (!promptContext || !scores) {
        return new Response(JSON.stringify({ error: "promptContext and scores are required for summary" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const safeChecks = Array.isArray(checks) ? checks : [];
      const { system, user } = buildPrompt(domain, promptContext, scores, safeChecks);

      let audit: Record<string, unknown>;
      let aiGenerated = true;
      try {
        audit = await generateGeminiAudit(system, user);
      } catch (aiErr) {
        console.error("AI commentary failed — returning templated summary:", aiErr);
        audit = buildFallbackAudit(domain, scores, safeChecks) as unknown as Record<string, unknown>;
        aiGenerated = false;
      }

      // Best-effort persistence — never blocks the response.
      try {
        await supabase.from("ai_reports").insert({
          scan_id: scanId, industry: audit.industry, industry_confidence: aiGenerated ? 0.95 : 0,
          business_summary: audit.business_summary, overall_summary: audit.overall_summary,
          final_score: scores.total, weaknesses_json: audit.weaknesses, strengths_json: audit.strengths,
          biggest_opportunity: audit.biggest_opportunity,
        });
        if (scanId) await supabase.from("scans").update({ status: "complete" }).eq("id", scanId);
      } catch (e) { console.error("ai_reports persist failed (non-fatal):", e); }

      return new Response(JSON.stringify({
        scanId, aiGenerated,
        summary: audit.overall_summary,
        biggestProblem: audit.biggest_problem,
        weaknesses: audit.weaknesses,
        strengths: audit.strengths,
        opportunity: audit.biggest_opportunity,
        businessImpact: audit.business_impact || [],
        quickFix: audit.quick_fix,
        industry: audit.industry,
        businessSummary: audit.business_summary,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PHASE: SCORE (default) ──────────────────────────────────────
    // Everything needed for the BETYG: crawl + PageSpeed + deterministic
    // checks + scoring. Returns immediately — the AI text and competitors are
    // fetched separately afterwards and never block the score.
    if (!scanId) {
      return new Response(JSON.stringify({ error: "scanId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const t0 = Date.now();
    await supabase.from("scans").update({ status: "crawling" }).eq("id", scanId);

    let html = "";
    let screenshotUrl: string | undefined;
    let fetchTimeMs = 0;
    let metadata: Record<string, unknown> | undefined;

    // Firecrawl + PageSpeed + SSL probe run in parallel (the long pole is PSI).
    const tParallel = Date.now();
    const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
      const t = Date.now(); const r = await fn(); return [r, Date.now() - t];
    };
    const [[firecrawlResult, firecrawlMs], [psiData, psiMs], [sslOk, sslMs]] = await Promise.all([
      timed(() => crawlWithFirecrawl(domain)),
      timed(() => fetchPageSpeedInsights(domain)),
      timed(() => probeSSL(domain)),
    ]);
    const parallelMs = Date.now() - tParallel;
    const tChecks = Date.now();

    if (psiData.performanceScore != null) {
      console.log("PSI data received:", JSON.stringify({ score: psiData.performanceScore, fcp: psiData.fcp, lcp: psiData.lcp }));
    } else {
      console.log("PSI unavailable, using fallback scoring. Error:", psiData.fetchError);
    }

    if (firecrawlResult && firecrawlResult.html) {
      html = firecrawlResult.html;
      screenshotUrl = firecrawlResult.screenshotUrl;
      fetchTimeMs = firecrawlResult.fetchTimeMs;
      metadata = firecrawlResult.metadata;
      console.log("Used Firecrawl successfully");
    } else {
      const fallbackResult = await fallbackCrawl(domain);
      html = fallbackResult.html;
      fetchTimeMs = fallbackResult.fetchTimeMs;
      console.log("Used fallback crawl");
    }

    if (!html) {
      await supabase.from("scans").update({ status: "failed" }).eq("id", scanId);
      return new Response(JSON.stringify({ error: "Kunde inte nå hemsidan. Kontrollera att domänen stämmer." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Phase 2 — Extract signals & run deterministic checks
    await supabase.from("scans").update({ status: "auditing" }).eq("id", scanId);
    const signals = extractSignals(html, domain, screenshotUrl, fetchTimeMs, metadata, sslOk);
    const checks = runAuditChecks(signals);

    // Inject real PSI audit checks (replace heuristic ones when available)
    if (psiData.performanceScore != null) {
      // Replace the heuristic load_time check with real PSI data
      const loadIdx = checks.findIndex(c => c.id === "load_time");
      if (loadIdx !== -1) {
        const lcp = psiData.lcp;
        checks[loadIdx] = {
          id: "load_time", label: "Laddtid (LCP)", category: "performance",
          passed: lcp != null && lcp < 2500,
          detail: lcp != null ? `${(lcp / 1000).toFixed(1)}s LCP – ${lcp < 2500 ? "snabb" : lcp < 4000 ? "medel, bör förbättras" : "långsam, besökare hinner lämna"}` : "Kunde inte mäta",
          impact: "high",
        };
      }

      // Add PSI-specific checks
      if (psiData.fcp != null) {
        checks.push({ id: "psi_fcp", label: "First Contentful Paint", category: "performance", passed: psiData.fcp < 1800, detail: `${(psiData.fcp / 1000).toFixed(1)}s – ${psiData.fcp < 1800 ? "snabb, bra första intryck" : "långsam, besökare ser en tom sida för länge"}`, impact: "medium" });
      }
      if (psiData.tbt != null) {
        checks.push({ id: "psi_tbt", label: "Total Blocking Time", category: "performance", passed: psiData.tbt < 200, detail: `${Math.round(psiData.tbt)}ms – ${psiData.tbt < 200 ? "responsiv" : "trög, knappar och scrollning hackar"}`, impact: "high" });
      }
      if (psiData.cls != null) {
        checks.push({ id: "psi_cls", label: "Visuell stabilitet (CLS)", category: "performance", passed: psiData.cls < 0.1, detail: `${psiData.cls.toFixed(3)} – ${psiData.cls < 0.1 ? "stabil layout" : "element hoppar runt, dålig upplevelse"}`, impact: "medium" });
      }
      if (psiData.speedIndex != null) {
        checks.push({ id: "psi_si", label: "Speed Index", category: "performance", passed: psiData.speedIndex < 3400, detail: `${(psiData.speedIndex / 1000).toFixed(1)}s – ${psiData.speedIndex < 3400 ? "bra visuell laddning" : "långsam visuell uppbyggnad"}`, impact: "medium" });
      }
    }

    // Calculate scores — use real PSI performance score when available
    const scores = calculateScores(checks);
    if (psiData.performanceScore != null) {
      // Blend: 70% real PSI, 30% heuristic to keep other checks relevant
      scores.performance = clamp(Math.round(psiData.performanceScore * 0.7 + scores.performance * 0.3));
      // Recalculate total
      scores.total = clamp(
        scores.seo * 0.25 + scores.conversion * 0.25 + scores.trust * 0.2 + scores.performance * 0.15 + scores.security * 0.15
      );
    }

    // Score is final & stable here (PageSpeed is already folded in). Leave the
    // scan at "ai_analysis" — the deferred summary phase flips it to "complete".
    await supabase.from("scans").update({ status: "ai_analysis" }).eq("id", scanId);

    // Compact context the (deferred) summary phase needs — so it never re-crawls.
    const promptContext: PromptSignals = {
      title: signals.title, metaDesc: signals.metaDesc, h1: signals.h1, h2s: signals.h2s,
      wordCount: signals.wordCount, imgCount: signals.imgCount, imgAltCount: signals.imgAltCount,
      ctaCount: signals.ctaCount, sectionCount: signals.sectionCount,
      trustSignalCount: signals.trustSignalCount, estimatedLoadTimeMs: signals.estimatedLoadTimeMs,
      textContentPreview: signals.textContentPreview,
    };

    return new Response(JSON.stringify({
      scanId,
      score: scores.total,
      categoryScores: { seo: scores.seo, conversion: scores.conversion, trust: scores.trust, performance: scores.performance, security: scores.security },
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
        estimatedLoadTimeMs: psiData.lcp || signals.estimatedLoadTimeMs,
      },
      pageSpeed: psiData.performanceScore != null ? {
        score: psiData.performanceScore,
        fcp: psiData.fcp,
        lcp: psiData.lcp,
        tbt: psiData.tbt,
        cls: psiData.cls,
        speedIndex: psiData.speedIndex,
        interactive: psiData.interactive,
      } : null,
      // Handed straight back to the summary phase (no re-crawl).
      promptContext,
      scores: { seo: scores.seo, conversion: scores.conversion, trust: scores.trust, performance: scores.performance, security: scores.security, total: scores.total },
      // Step timings (ms) — per-step measurement.
      _timings: {
        firecrawlMs,                       // Firecrawl scrape (ran in parallel)
        psiMs,                             // PageSpeed Insights (ran in parallel)
        sslMs,                             // SSL probe (ran in parallel)
        parallelMs,                        // wall-clock of the parallel block = max of the three
        checksMs: Date.now() - tChecks,    // extract signals + deterministic checks + scoring
        scorePhaseMs: Date.now() - t0,     // whole score phase (== time to BETYG visible)
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-website error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
