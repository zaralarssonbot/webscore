import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──────────────────────────────────────────────────────────
interface CompetitorResult {
  name: string;
  domain: string;
  url: string;
  score: number;
  strength: string;
  distance_km: number | null;
  cta_count: number;
  design_rating: number;
  has_reviews: boolean;
}

interface QuickSignals {
  hasTitle: boolean;
  hasMetaDesc: boolean;
  hasH1: boolean;
  hasViewport: boolean;
  hasCTA: boolean;
  ctaCount: number;
  hasForm: boolean;
  hasSocialLinks: boolean;
  hasTestimonials: boolean;
  hasSSL: boolean;
  hasStructuredData: boolean;
  hasOgTags: boolean;
  imgCount: number;
  wordCount: number;
  businessName: string;
  isBusinessSite: boolean;
}

// ── Blocklist: news, aggregators, directories, social ──────────────
const BLOCKLIST_PATTERNS = [
  /google\./i, /facebook\./i, /instagram\./i, /youtube\./i, /twitter\./i, /x\.com/i,
  /linkedin\./i, /tiktok\./i, /pinterest\./i, /reddit\./i,
  /wikipedia\./i, /yelp\./i, /tripadvisor\./i,
  /hitta\.se/i, /eniro\./i, /gulasidorna\./i, /allabolag\.se/i, /ratsit\.se/i,
  /bolagsfakta\.se/i, /foretagsfakta\.se/i, /largestcompanies\./i, /bolagsverket\.se/i,
  /nyheter24\./i, /aftonbladet\./i, /expressen\./i, /svd\./i, /dn\./i, /gp\./i,
  /dagenshandel\./i, /dagligvarunytt\./i, /market\.se/i, /breakit\./i, /di\.se/i,
  /svt\.se/i, /sr\.se/i, /tv4\.se/i, /matvarlden\.se/i,
  /trustpilot\./i, /glassdoor\./i, /indeed\./i, /salesonly\./i, /manpower\./i, /randstad\./i,
  /pricerunner\./i, /prisjakt\./i, /kelkoo\./i,
  /github\./i, /stackoverflow\./i, /medium\./i, /wordpress\.com/i,
  /amazon\./i, /ebay\./i, /tradera\./i, /blocket\.se/i,
  /kommun\.se/i, /\.gov\./i, /regeringen\.se/i,
  /stadsmissionen\./i, /rfreningen\./i, /stiftelsen\./i,
  /recruitit\./i, /jobbsafari\./i, /arbetsformedlingen\./i,
];

function isBlockedDomain(domain: string): boolean {
  return BLOCKLIST_PATTERNS.some((p) => p.test(domain));
}

// ── Extract domain from URL ────────────────────────────────────────
function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

// ── Quick scrape for scoring ───────────────────────────────────────
async function quickScrape(url: string): Promise<{ html: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebsiteAuditBot/1.0)", Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();
    return { html: html.slice(0, 100000) };
  } catch {
    return null;
  }
}

// ── Extract quick signals from HTML ────────────────────────────────
function extractQuickSignals(html: string, url: string): QuickSignals {
  const test = (re: RegExp) => re.test(html);
  const count = (re: RegExp) => (html.match(re) || []).length;

  const ctaRegex = /(?:kontakta|boka|köp|beställ|offert|gratis|ring|contact|book|buy|order|quote|free|call|get started|kom igång|handla|lägg i varukorg|add to cart)/gi;
  const ctaCount = count(ctaRegex);

  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try to extract business name from title or OG
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const businessName = ogNameMatch?.[1] || titleMatch?.[1]?.split(/[|\-–—]/)[0]?.trim() || "";

  // Detect if this is a real business site (not a news/directory/aggregator)
  const newsIndicators = count(/(?:artikel|nyheter|redaktion|journalist|publicerad|uppdaterad|cookies|annons|prenumer)/gi);
  const businessIndicators = count(/(?:om oss|about us|kontakta oss|contact us|våra tjänster|our services|öppettider|priser|boka tid|offert)/gi);
  const isBusinessSite = businessIndicators >= 1 || (newsIndicators < 3 && textContent.length < 50000);

  return {
    hasTitle: test(/<title[^>]*>[^<]+<\/title>/i),
    hasMetaDesc: test(/<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i),
    hasH1: test(/<h1[^>]*>[^<]*[^<]+<\/h1>/i),
    hasViewport: test(/<meta[^>]*name=["']viewport["']/i),
    hasCTA: ctaCount > 0,
    ctaCount,
    hasForm: test(/<form/i),
    hasSocialLinks: test(/(?:facebook|instagram|linkedin|twitter|youtube|tiktok)\.com/i),
    hasTestimonials: test(/(?:omdöme|recension|testimonial|review|betyg|stars|stjärnor)/i),
    hasSSL: true,
    hasStructuredData: test(/application\/ld\+json/i),
    hasOgTags: test(/<meta[^>]*property=["']og:/i),
    imgCount: count(/<img/gi),
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
    businessName,
    isBusinessSite,
  };
}

// ── Calculate a quick score from signals ───────────────────────────
function calculateQuickScore(s: QuickSignals): number {
  let score = 45;
  if (s.hasTitle) score += 6;
  if (s.hasMetaDesc) score += 6;
  if (s.hasH1) score += 5;
  if (s.hasViewport) score += 5;
  if (s.hasCTA) score += 4;
  if (s.ctaCount >= 3) score += 3;
  if (s.hasForm) score += 5;
  if (s.hasSocialLinks) score += 3;
  if (s.hasTestimonials) score += 4;
  if (s.hasStructuredData) score += 4;
  if (s.hasOgTags) score += 3;
  if (s.wordCount >= 300) score += 3;
  if (s.imgCount >= 3) score += 2;
  return Math.max(40, Math.min(95, score));
}

// ── Determine strength description ────────────────────────────────
function describeStrength(s: QuickSignals, score: number): string {
  const strengths: string[] = [];
  if (s.hasTestimonials) strengths.push("synliga omdömen");
  if (s.ctaCount >= 3) strengths.push("tydliga uppmaningar");
  if (s.hasForm) strengths.push("kontaktformulär");
  if (s.hasStructuredData) strengths.push("strukturerad data");
  if (s.hasSocialLinks) strengths.push("aktiv i sociala medier");
  if (s.wordCount >= 500) strengths.push("omfattande innehåll");
  if (s.hasViewport && s.hasMetaDesc) strengths.push("mobilanpassad med bra SEO");

  if (strengths.length === 0) {
    return score >= 75 ? "Väloptimerad hemsida" : "Bättre grundläggande SEO";
  }
  return strengths.slice(0, 2).join(" och ").replace(/^./, (c) => c.toUpperCase());
}

// ── Design rating heuristic ───────────────────────────────────────
function estimateDesignRating(s: QuickSignals): number {
  let r = 2;
  if (s.hasViewport) r += 0.5;
  if (s.hasOgTags) r += 0.5;
  if (s.imgCount >= 5) r += 0.5;
  if (s.hasCTA) r += 0.5;
  if (s.hasForm) r += 0.5;
  return Math.min(5, Math.round(r));
}

// ── Search for competitors using Firecrawl ─────────────────────────
async function searchCompetitors(
  industry: string,
  city: string,
  excludeDomain: string,
  domain: string
): Promise<{ url: string; title: string; description: string }[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.error("FIRECRAWL_API_KEY not set");
    return [];
  }

  // Build targeted search queries — focus on finding actual businesses, not articles
  const domainBase = extractDomain(domain).replace(/\.[a-z]+$/, "");
  const queries = [
    `${industry} ${city} butik webbplats`,
    `alternativ till ${domainBase} ${industry} ${city}`,
    `${industry} företag ${city} kontakt`,
  ];

  const allResults: { url: string; title: string; description: string }[] = [];
  const seenDomains = new Set<string>();
  seenDomains.add(extractDomain(excludeDomain));

  for (const query of queries) {
    if (allResults.length >= 8) break;

    try {
      console.log("Firecrawl search:", query);
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 10,
          lang: "sv",
          country: "se",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Firecrawl search error:", resp.status, errText);
        continue;
      }

      const data = await resp.json();
      const results = data.data || data.results || [];

      for (const r of results) {
        const url = r.url || r.link;
        if (!url) continue;
        const rDomain = extractDomain(url);

        // Skip own domain, duplicates, and blocked domains
        if (seenDomains.has(rDomain)) continue;
        if (isBlockedDomain(rDomain)) continue;

        // Skip URLs that look like article/list pages
        const path = url.toLowerCase();
        if (/\/(nyheter|artikel|blog|press|lista|topp-|ranking)/.test(path)) continue;

        seenDomains.add(rDomain);
        allResults.push({
          url: url.startsWith("http") ? url : `https://${url}`,
          title: r.title || "",
          description: r.description || "",
        });
      }
    } catch (e) {
      console.error("Search failed for query:", query, e);
    }
  }

  return allResults.slice(0, 8);
}

// ── Main handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain, industry, city, userScore } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchIndustry = industry || "företag";
    const searchCity = city || "Stockholm";
    const baseScore = userScore || 60;

    console.log(`Finding competitors for ${domain} | Industry: ${searchIndustry} | City: ${searchCity}`);

    // Step 1: Search for competitors
    const searchResults = await searchCompetitors(searchIndustry, searchCity, domain, domain);
    console.log(`Found ${searchResults.length} candidate competitors`);

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({ competitors: [], source: "none" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Quick-scrape each candidate in parallel (max 5)
    const candidates = searchResults.slice(0, 5);
    const scrapePromises = candidates.map(async (c) => {
      const scraped = await quickScrape(c.url);
      return { ...c, scraped };
    });
    const scrapedCandidates = await Promise.all(scrapePromises);

    // Step 3: Score, validate, and build competitor objects
    const competitors: CompetitorResult[] = [];
    for (const c of scrapedCandidates) {
      const compDomain = extractDomain(c.url);

      if (c.scraped) {
        const signals = extractQuickSignals(c.scraped.html, c.url);

        // Skip if not a real business site (news/directory/aggregator)
        if (!signals.isBusinessSite) {
          console.log(`Skipping non-business site: ${compDomain}`);
          continue;
        }

        const score = calculateQuickScore(signals);

        // We have no real geolocation for these search-derived businesses, so
        // we do NOT invent a distance. null = "unknown"; the UI hides it.
        competitors.push({
          name: signals.businessName || c.title?.split(/[|\-–—]/)[0]?.trim() || compDomain,
          domain: compDomain,
          url: c.url,
          score,
          strength: describeStrength(signals, score),
          distance_km: null,
          cta_count: signals.ctaCount,
          design_rating: estimateDesignRating(signals),
          has_reviews: signals.hasTestimonials,
        });
      }
      // Don't include sites we couldn't scrape — no guessing
    }

    // Sort by score descending, take top 3
    competitors.sort((a, b) => b.score - a.score);
    const topCompetitors = competitors.slice(0, 3);

    console.log(`Returning ${topCompetitors.length} verified competitors:`, topCompetitors.map(c => c.domain));
    return new Response(
      JSON.stringify({ competitors: topCompetitors, source: "firecrawl" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("find-competitors error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", competitors: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
