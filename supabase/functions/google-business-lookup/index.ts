const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    if (!domain) {
      return new Response(
        JSON.stringify({ error: "domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Looking up Google Business for:", domain);

    // Search for the business on Google Maps via Firecrawl search
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${domain} site:google.com/maps OR "google reviews" ${domain}`,
        limit: 5,
        lang: "sv",
        country: "SE",
      }),
    });

    if (!searchResp.ok) {
      console.error("Firecrawl search error:", searchResp.status);
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResp.json();
    const results = searchData.data || [];

    // Try to extract rating and review count from search results
    let rating: number | null = null;
    let reviewCount: number | null = null;
    let businessName: string | null = null;
    let category: string | null = null;

    for (const result of results) {
      const text = `${result.title || ""} ${result.description || ""} ${result.markdown || ""}`;
      
      // Look for star rating patterns like "4.5" or "4,5" near "reviews/omdömen/stjärnor"
      const ratingMatch = text.match(/(\d[.,]\d)\s*(?:stjärn|star|rating|av\s*5|\/\s*5)/i) ||
                          text.match(/(?:betyg|rating|stjärn)\s*:?\s*(\d[.,]\d)/i) ||
                          text.match(/(\d[.,]\d)\s*\(\d+\s*(?:review|omdöme|recension)/i);
      if (ratingMatch && !rating) {
        rating = parseFloat(ratingMatch[1].replace(",", "."));
      }

      // Look for review count
      const reviewMatch = text.match(/(\d+)\s*(?:review|omdöme|recension|Google[\s-]*review)/i) ||
                          text.match(/\((\d+)\s*(?:review|omdöme)/i);
      if (reviewMatch && !reviewCount) {
        reviewCount = parseInt(reviewMatch[1], 10);
      }

      // Business name from title
      if (!businessName && result.title) {
        businessName = result.title.split(" - ")[0].split(" | ")[0].trim();
      }
    }

    // If we couldn't find structured data, try scraping a Google search for the domain + reviews
    if (!rating && !reviewCount) {
      try {
        const altSearchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `"${domain}" google omdömen betyg`,
            limit: 3,
            lang: "sv",
            country: "SE",
          }),
        });

        if (altSearchResp.ok) {
          const altData = await altSearchResp.json();
          for (const result of (altData.data || [])) {
            const text = `${result.title || ""} ${result.description || ""} ${result.markdown || ""}`;
            const rMatch = text.match(/(\d[.,]\d)\s*(?:stjärn|star|\/\s*5)/i);
            if (rMatch && !rating) rating = parseFloat(rMatch[1].replace(",", "."));
            const cMatch = text.match(/(\d+)\s*(?:review|omdöme|recension)/i);
            if (cMatch && !reviewCount) reviewCount = parseInt(cMatch[1], 10);
          }
        }
      } catch {
        console.log("Alt search failed, continuing without");
      }
    }

    const found = rating !== null || reviewCount !== null;

    return new Response(
      JSON.stringify({
        found,
        rating: rating || null,
        reviewCount: reviewCount || null,
        businessName: businessName || null,
        category: category || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("google-business-lookup error:", error);
    return new Response(
      JSON.stringify({ found: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
