// Pure, dependency-free measurement core for analyze-website.
//
// EVERYTHING that decides trust — how HTML becomes signals, how signals become
// pass/fail checks, how checks become the deterministic score, what counts as a
// valid measurement, and what to do when a forced refresh fails — lives here so
// it can be unit-tested from Vitest (Node) with zero Deno/network dependencies.
// index.ts keeps only the impure I/O (fetch, env, Supabase) and calls into this.
//
// The scoring here is an EXACT port of src/lib/scoring-engine.ts. A test asserts
// the two agree on every sample input, so the backend, the cache and the
// frontend can never drift to two different scores for the same measurement.

// ── Types ──────────────────────────────────────────────────────────
export type Category = "seo" | "conversion" | "trust" | "performance" | "security";
export type Impact = "high" | "medium" | "low";

export interface AuditCheck {
  id: string;
  label: string;
  category: Category;
  passed: boolean;
  detail: string;
  impact: Impact;
}

/** The only PageSpeed fields the score/checks need. */
export interface PageSpeedLite {
  score: number | null; // 0-100 Lighthouse performance score
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  speedIndex: number | null;
  interactive?: number | null;
}

export interface SiteSignals {
  url: string;
  title: string;
  pageTitle: string;
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
  screenshotUrl?: string;
}

// ── Check provenance classification (Task 1) ───────────────────────
// Every check a measurement can emit is classified by how its value is obtained.
// A test asserts every emitted check id appears here, so nothing can be shown
// without a declared, honest source. No check is ever "ai" — AI writes prose only.
export type Provenance =
  | "measured"   // a real DOM/head/TLS/Lighthouse fact was read
  | "derived"    // a deterministic threshold applied to a measured value
  | "heuristic"; // inferred from fuzzy keyword/text matching (may mis-classify)

export const CHECK_PROVENANCE: Record<string, { source: Provenance; basis: string }> = {
  // SEO — parsed <head>/DOM
  title: { source: "measured", basis: "<title> / og:title from parsed head" },
  meta_desc: { source: "measured", basis: "<meta name=description> content" },
  h1: { source: "measured", basis: "first <h1> text" },
  h2s: { source: "derived", basis: "count of <h2> ≥ 2" },
  og_tags: { source: "measured", basis: "presence of og: meta tags" },
  canonical: { source: "measured", basis: "<link rel=canonical>" },
  structured_data: { source: "measured", basis: "application/ld+json block" },
  img_alt: { source: "derived", basis: "share of <img> with non-empty alt ≥ 50%" },
  word_count: { source: "derived", basis: "visible text token count ≥ 300" },
  analytics: { source: "measured", basis: "analytics/gtag snippet present" },
  title_length: { source: "derived", basis: "measured title length within 30–65" },
  meta_length: { source: "derived", basis: "measured description length within 120–160" },
  internal_links: { source: "measured", basis: "count of same-domain <a href>" },
  heading_hierarchy: { source: "derived", basis: "H1 present and ≥1 H2 present" },
  // Conversion
  cta: { source: "heuristic", basis: "CTA keyword vocabulary match" },
  cta_count: { source: "heuristic", basis: "count of CTA keyword matches ≥ 3" },
  forms: { source: "measured", basis: "count of <form> elements" },
  phone: { source: "measured", basis: "tel: link present" },
  email: { source: "measured", basis: "mailto: link present" },
  pricing: { source: "heuristic", basis: "pricing keyword match" },
  sections: { source: "measured", basis: "count of section/article/main ≥ 3" },
  // Trust
  ssl: { source: "measured", basis: "real TLS handshake to https://domain" },
  social: { source: "heuristic", basis: "links to social platform domains" },
  testimonials: { source: "heuristic", basis: "review/testimonial keyword match" },
  address: { source: "heuristic", basis: "<address> or street-word keyword match" },
  favicon: { source: "measured", basis: "<link rel=icon> present" },
  privacy: { source: "heuristic", basis: "privacy-policy keyword match" },
  trust_signals: { source: "heuristic", basis: "count of trust-signal keyword groups ≥ 3" },
  // Performance (HTML)
  page_size: { source: "derived", basis: "measured HTML byte size < 150 KB" },
  scripts: { source: "derived", basis: "count of <script> ≤ 10" },
  viewport: { source: "measured", basis: "<meta name=viewport> present" },
  lazy_load: { source: "measured", basis: "loading=lazy present (or ≤3 images)" },
  responsive_img: { source: "measured", basis: "srcset/<picture> present" },
  // Performance (Google Lighthouse — real lab measurement)
  load_time: { source: "measured", basis: "Lighthouse Largest Contentful Paint" },
  psi_fcp: { source: "measured", basis: "Lighthouse First Contentful Paint" },
  psi_tbt: { source: "measured", basis: "Lighthouse Total Blocking Time" },
  psi_cls: { source: "measured", basis: "Lighthouse Cumulative Layout Shift" },
  psi_si: { source: "measured", basis: "Lighthouse Speed Index" },
  // Security
  https: { source: "measured", basis: "real TLS handshake to https://domain" },
  cookie_consent: { source: "heuristic", basis: "cookie/GDPR consent keyword match" },
  robots: { source: "measured", basis: "<meta name=robots> present" },
};

/** The AI text fields — prose only, NEVER a check, NEVER scored. */
export const AI_TEXT_FIELDS = [
  "industry", "business_summary", "overall_summary", "biggest_problem",
  "weaknesses", "strengths", "business_impact", "biggest_opportunity", "quick_fix",
] as const;

// ── Signal extraction ──────────────────────────────────────────────
export function extractSignals(
  html: string,
  domain: string,
  screenshotUrl?: string,
  metadata?: Record<string, unknown>,
  hasSSL = true,
): SiteSignals {
  const test = (re: RegExp) => re.test(html);
  const count = (re: RegExp) => (html.match(re) || []).length;

  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const headHtml = headMatch ? headMatch[0] : html;
  const headSearch = headHtml.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const headTest = (re: RegExp) => re.test(headSearch);

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

  const headTitleMatch = headSearch.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const headTitle = headTitleMatch ? headTitleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
  const title = metaStr(["title", "ogTitle", "og:title"]) || headTitle;

  const headMetaDescMatch =
    headSearch.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    headSearch.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDesc = metaStr(["description", "ogDescription", "og:description"]) ||
    (headMetaDescMatch ? headMetaDescMatch[1].trim() : "");

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

  const ctaRegex = /(?:kontakta|boka|köp|beställ|offert|gratis|ring|contact|book|buy|order|quote|free|call|get started|kom igång)/gi;
  const ctaCount = (html.match(ctaRegex) || []).length;

  const sectionCount = count(/<(?:section|article|main)\b/gi);

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

// ── Deterministic audit checks (HTML only; NO guessed load time) ───
// The old fetch-time "Uppskattad laddtid" check is deliberately gone: network
// round-trip time is our connection to the site, not the site's real load time.
// Real load time (LCP) is added by applyPageSpeedChecks ONLY when Lighthouse
// actually measured it — never guessed.
export function runAuditChecks(s: SiteSignals): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // SEO
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

  const titleLen = s.title.length;
  checks.push({ id: "title_length", label: "Titellängd", category: "seo", passed: titleLen >= 30 && titleLen <= 65, detail: titleLen === 0 ? "Saknas" : `${titleLen} tecken – ${titleLen >= 30 && titleLen <= 65 ? "optimal längd (30-65)" : titleLen < 30 ? "för kort, bör vara 30-65 tecken" : "för lång, bör vara 30-65 tecken"}`, impact: "medium" });

  const metaLen = s.metaDesc.length;
  checks.push({ id: "meta_length", label: "Meta-beskrivningslängd", category: "seo", passed: metaLen >= 120 && metaLen <= 160, detail: metaLen === 0 ? "Saknas" : `${metaLen} tecken – ${metaLen >= 120 && metaLen <= 160 ? "optimal längd (120-160)" : metaLen < 120 ? "för kort, bör vara 120-160 tecken" : "för lång, kan klippas i sökresultat"}`, impact: "medium" });

  checks.push({ id: "internal_links", label: "Intern länkning", category: "seo", passed: s.internalLinkCount >= 3, detail: `${s.internalLinkCount} interna länkar – ${s.internalLinkCount >= 3 ? "bra intern länkstruktur" : "för få, sökmotorer har svårt att navigera sidan"}`, impact: "medium" });

  const hasH2AfterH1 = !!s.h1 && s.h2s.length > 0;
  checks.push({ id: "heading_hierarchy", label: "Rubrikhierarki (H1→H2)", category: "seo", passed: hasH2AfterH1, detail: hasH2AfterH1 ? "Korrekt – H1 följs av H2-underrubriker" : "Bruten hierarki – saknar tydlig H1→H2-struktur", impact: "low" });

  // Conversion
  checks.push({ id: "cta", label: "Call-to-action (CTA)", category: "conversion", passed: s.hasCTA, detail: s.hasCTA ? `${s.ctaCount} uppmaningar hittade` : "Inga tydliga uppmaningar att agera", impact: "high" });
  checks.push({ id: "cta_count", label: "Antal CTA:er", category: "conversion", passed: s.ctaCount >= 3, detail: `${s.ctaCount} CTA:er – ${s.ctaCount >= 3 ? "bra spridning av uppmaningar" : "för få, besökare behöver fler möjligheter att agera"}`, impact: "medium" });
  checks.push({ id: "forms", label: "Kontaktformulär", category: "conversion", passed: s.formCount >= 1, detail: s.formCount > 0 ? `${s.formCount} formulär hittade` : "Inget formulär – svårt för besökare att kontakta", impact: "high" });
  checks.push({ id: "phone", label: "Klickbart telefonnummer", category: "conversion", passed: s.hasPhoneLink, detail: s.hasPhoneLink ? "Finns – mobilanvändare kan ringa direkt" : "Saknas – mobilanvändare kan inte ringa med ett klick", impact: "high" });
  checks.push({ id: "email", label: "Klickbar e-postlänk", category: "conversion", passed: s.hasEmailLink, detail: s.hasEmailLink ? "Finns – snabb kontaktväg" : "Saknas – ingen direkt e-postkontakt", impact: "medium" });
  checks.push({ id: "pricing", label: "Prisinformation", category: "conversion", passed: s.hasPricing, detail: s.hasPricing ? "Prisinformation hittad" : "Saknas – besökare vet inte vad det kostar", impact: "medium" });
  checks.push({ id: "sections", label: "Sidstruktur (sektioner)", category: "conversion", passed: s.sectionCount >= 3, detail: `${s.sectionCount} sektioner – ${s.sectionCount >= 3 ? "välstrukturerad sida" : "för få sektioner, sidan kan upplevas tunn"}`, impact: "low" });

  // Trust
  checks.push({ id: "ssl", label: "SSL-certifikat (HTTPS)", category: "trust", passed: s.hasSSL, detail: s.hasSSL ? "Aktiv – sidan är krypterad" : "Saknas – besökare ser 'Ej säker' i webbläsaren", impact: "high" });
  checks.push({ id: "social", label: "Sociala medier-länkar", category: "trust", passed: s.hasSocialLinks, detail: s.hasSocialLinks ? "Hittade länkar till sociala medier" : "Inga sociala medier-länkar", impact: "medium" });
  checks.push({ id: "testimonials", label: "Omdömen / recensioner", category: "trust", passed: s.hasTestimonials, detail: s.hasTestimonials ? "Hittade sociala bevis" : "Saknas – inga omdömen bygger förtroende", impact: "high" });
  checks.push({ id: "address", label: "Fysisk adress", category: "trust", passed: s.hasAddress, detail: s.hasAddress ? "Adressinformation hittad" : "Saknas – verkar inte ha fysisk närvaro", impact: "medium" });
  checks.push({ id: "favicon", label: "Favicon / webbplatsikon", category: "trust", passed: s.hasFavicon, detail: s.hasFavicon ? "Finns – professionellt intryck i webbläsarfliken" : "Saknas – generisk flik i webbläsaren", impact: "low" });
  checks.push({ id: "privacy", label: "Integritetspolicy", category: "trust", passed: s.hasPrivacyPolicy, detail: s.hasPrivacyPolicy ? "Finns – GDPR-medvetenhet" : "Saknas – lagkrav som inte uppfylls", impact: "medium" });
  checks.push({ id: "trust_signals", label: "Förtroendesignaler", category: "trust", passed: s.trustSignalCount >= 3, detail: `${s.trustSignalCount} förtroendesignaler – ${s.trustSignalCount >= 3 ? "bra mängd sociala bevis" : "för få, besökare saknar trygghet"}`, impact: "medium" });

  // Performance (HTML signals — real load time is added from Lighthouse later)
  checks.push({ id: "page_size", label: "Sidstorlek", category: "performance", passed: s.htmlSizeKB < 150, detail: `${s.htmlSizeKB} KB – ${s.htmlSizeKB < 150 ? "bra storlek" : "för stor, påverkar laddtid"}`, impact: "medium" });
  checks.push({ id: "scripts", label: "Antal skript", category: "performance", passed: s.scriptCount <= 10, detail: `${s.scriptCount} skript – ${s.scriptCount <= 10 ? "rimligt antal" : "för många, gör sidan långsammare"}`, impact: "medium" });
  checks.push({ id: "viewport", label: "Mobilanpassning (viewport)", category: "performance", passed: s.hasViewport, detail: s.hasViewport ? "Sidan är mobilanpassad" : "Saknas – sidan fungerar dåligt på mobiler", impact: "high" });
  checks.push({ id: "lazy_load", label: "Lazy loading av bilder", category: "performance", passed: s.hasLazyLoad || s.imgCount <= 3, detail: s.hasLazyLoad ? "Aktivt – bilder laddas smart" : s.imgCount <= 3 ? "Få bilder, inte nödvändigt" : "Saknas – alla bilder laddas samtidigt", impact: "low" });
  checks.push({ id: "responsive_img", label: "Responsiva bilder", category: "performance", passed: s.hasResponsiveImages, detail: s.hasResponsiveImages ? "Srcset/picture används" : "Saknas – samma bildstorlek oavsett enhet", impact: "low" });

  // Security
  checks.push({ id: "https", label: "HTTPS-kryptering", category: "security", passed: s.hasSSL, detail: s.hasSSL ? "Aktiv kryptering" : "Saknas – all data skickas okrypterat", impact: "high" });
  checks.push({ id: "cookie_consent", label: "Cookie-samtycke / GDPR", category: "security", passed: s.hasCookieConsent, detail: s.hasCookieConsent ? "Finns – uppfyller lagkrav" : "Saknas – potentiellt lagbrott", impact: "high" });
  checks.push({ id: "robots", label: "Robots meta-tagg", category: "security", passed: s.hasRobotsMeta, detail: s.hasRobotsMeta ? "Finns – kontroll över indexering" : "Saknas – ingen kontroll över vad sökmotorer indexerar", impact: "low" });

  return checks;
}

/**
 * Add the REAL Lighthouse-measured performance checks. Called only with PSI
 * data that actually has a numeric performance score. When Lighthouse did not
 * return a metric, that individual check is simply omitted (never guessed).
 */
export function applyPageSpeedChecks(base: AuditCheck[], psi: PageSpeedLite): AuditCheck[] {
  const checks = base.slice();
  if (psi.lcp != null) {
    checks.push({
      id: "load_time", label: "Laddtid (LCP)", category: "performance",
      passed: psi.lcp < 2500,
      detail: `${(psi.lcp / 1000).toFixed(1)}s LCP – ${psi.lcp < 2500 ? "snabb" : psi.lcp < 4000 ? "medel, bör förbättras" : "långsam, besökare hinner lämna"}`,
      impact: "high",
    });
  }
  if (psi.fcp != null) {
    checks.push({ id: "psi_fcp", label: "First Contentful Paint", category: "performance", passed: psi.fcp < 1800, detail: `${(psi.fcp / 1000).toFixed(1)}s – ${psi.fcp < 1800 ? "snabb, bra första intryck" : "långsam, besökare ser en tom sida för länge"}`, impact: "medium" });
  }
  if (psi.tbt != null) {
    checks.push({ id: "psi_tbt", label: "Total Blocking Time", category: "performance", passed: psi.tbt < 200, detail: `${Math.round(psi.tbt)}ms – ${psi.tbt < 200 ? "responsiv" : "trög, knappar och scrollning hackar"}`, impact: "high" });
  }
  if (psi.cls != null) {
    checks.push({ id: "psi_cls", label: "Visuell stabilitet (CLS)", category: "performance", passed: psi.cls < 0.1, detail: `${psi.cls.toFixed(3)} – ${psi.cls < 0.1 ? "stabil layout" : "element hoppar runt, dålig upplevelse"}`, impact: "medium" });
  }
  if (psi.speedIndex != null) {
    checks.push({ id: "psi_si", label: "Speed Index", category: "performance", passed: psi.speedIndex < 3400, detail: `${(psi.speedIndex / 1000).toFixed(1)}s – ${psi.speedIndex < 3400 ? "bra visuell laddning" : "långsam visuell uppbyggnad"}`, impact: "medium" });
  }
  return checks;
}

// ── Deterministic score — EXACT port of src/lib/scoring-engine.ts ──
// A test (scoring-parity) asserts this equals the frontend engine on every
// sample, so backend / cache / UI can never show two different scores.
const CATEGORY_META: { key: Category; weight: number }[] = [
  { key: "performance", weight: 0.25 },
  { key: "seo", weight: 0.2 },
  { key: "conversion", weight: 0.2 },
  { key: "trust", weight: 0.2 },
  { key: "security", weight: 0.15 },
];
const IMPACT_POINTS: Record<Impact, number> = { high: 3, medium: 2, low: 1 };
const NON_SCORED = new Set(["load_time", "psi_fcp", "psi_tbt", "psi_cls", "psi_si"]);
const PERF_HTML = ["viewport", "responsive_img", "lazy_load", "page_size", "scripts"];
const bucketPsi = (score: number) => Math.round(score / 5) * 5;
const pct = (earned: number, possible: number) => (possible > 0 ? (earned / possible) * 100 : 0);

export interface CategoryScores { seo: number; conversion: number; trust: number; performance: number; security: number; }
export interface ScoreResult { total: number; categoryScores: CategoryScores; }

function performanceScore(checks: AuditCheck[], pageSpeed?: PageSpeedLite | null): number {
  const html = checks.filter((c) => PERF_HTML.includes(c.id));
  const htmlEarned = html.filter((c) => c.passed).reduce((a, c) => a + IMPACT_POINTS[c.impact], 0);
  const htmlPossible = html.reduce((a, c) => a + IMPACT_POINTS[c.impact], 0);
  const htmlPct = htmlPossible > 0 ? pct(htmlEarned, htmlPossible) : 60;
  let score: number;
  if (pageSpeed && typeof pageSpeed.score === "number") {
    const psi = bucketPsi(pageSpeed.score);
    score = Math.round(psi * 0.7 + htmlPct * 0.3);
  } else {
    score = Math.round(htmlPct);
  }
  return Math.max(0, Math.min(100, score));
}

/** THE score. Pure and deterministic. NO AI input exists in this signature. */
export function computeDeterministicScore(checks: AuditCheck[], pageSpeed?: PageSpeedLite | null): ScoreResult {
  const list = checks ?? [];
  const catScore: Record<Category, number> = { seo: 0, conversion: 0, trust: 0, performance: 0, security: 0 };
  const catPossible: Record<Category, number> = { seo: 0, conversion: 0, trust: 0, performance: 0, security: 0 };

  for (const meta of CATEGORY_META) {
    if (meta.key === "performance") { catScore.performance = performanceScore(list, pageSpeed); continue; }
    const catChecks = list.filter((c) => c.category === meta.key && !NON_SCORED.has(c.id));
    let earned = 0, possible = 0;
    for (const c of catChecks) { const p = IMPACT_POINTS[c.impact]; possible += p; if (c.passed) earned += p; }
    catScore[meta.key] = Math.round(pct(earned, possible));
    catPossible[meta.key] = possible;
  }

  let weightSum = 0, acc = 0;
  for (const meta of CATEGORY_META) {
    const measurable = meta.key === "performance" || catPossible[meta.key] > 0;
    if (measurable) { weightSum += meta.weight; acc += catScore[meta.key] * meta.weight; }
  }
  const total = weightSum > 0 ? Math.round(acc / weightSum) : 0;

  return {
    total: Math.max(0, Math.min(100, total)),
    categoryScores: { ...catScore },
  };
}

// ── Minimum valid measurement (Task 5) ─────────────────────────────
export const MIN_CHECKS = 20;

export interface MeasurementInputs {
  usedFirecrawl: boolean;   // real rendered crawl (not the plain-fetch fallback)
  htmlPresent: boolean;     // we actually got HTML
  psiOk: boolean;           // Lighthouse returned a numeric performance score
  checkCount: number;       // number of audit checks produced
}

/**
 * The single definition of "valid enough to be the cached truth". A measurement
 * may ONLY be cached when this returns true. Anything less is returned to the
 * caller as partial but never persisted as the shared measurement.
 */
export function isMinimumValidMeasurement(m: MeasurementInputs): boolean {
  return m.usedFirecrawl && m.htmlPresent && m.psiOk && m.checkCount >= MIN_CHECKS;
}

/** Human-readable reasons a measurement is partial (empty when complete). */
export function partialReasons(m: MeasurementInputs): string[] {
  const r: string[] = [];
  if (!m.htmlPresent) r.push("no_html");
  if (!m.usedFirecrawl && m.htmlPresent) r.push("used_fallback_crawl");
  if (!m.psiOk) r.push("pagespeed_unavailable");
  if (m.checkCount < MIN_CHECKS) r.push("too_few_checks");
  return r;
}

// ── Forced-refresh preservation (Task 6) ───────────────────────────
export type RefreshAction =
  | { cache: true; respondWith: "fresh"; refreshFailed: false }
  | { cache: false; respondWith: "fresh"; refreshFailed: false }
  | { cache: false; respondWith: "previous"; refreshFailed: true };

/**
 * Decide what a run should do with its fresh result.
 *   • fresh measurement is complete            → cache it, return it.
 *   • fresh is incomplete but a valid previous
 *     cached measurement exists                → KEEP the old one, return it
 *                                                 (never overwrite good with bad).
 *   • fresh is incomplete and nothing to fall
 *     back to                                  → return the partial, cache nothing.
 */
export function decideRefreshAction(args: {
  freshComplete: boolean;
  hasPreviousValid: boolean;
}): RefreshAction {
  if (args.freshComplete) return { cache: true, respondWith: "fresh", refreshFailed: false };
  if (args.hasPreviousValid) return { cache: false, respondWith: "previous", refreshFailed: true };
  return { cache: false, respondWith: "fresh", refreshFailed: false };
}
