const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AI model for company-data extraction. Change here to swap models later.
const GEMINI_MODEL = 'gemini-2.5-flash';
// Google's OpenAI-compatible endpoint (keeps response_format json_object).
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const cleanString = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgNumber } = await req.json();

    if (!orgNumber || typeof orgNumber !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Organisationsnummer krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleaned = digitsOnly(orgNumber);
    if (!/^\d{10}$/.test(cleaned)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ogiltigt organisationsnummer. Ange 10 siffror.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formatted = `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
    const orgRegex = new RegExp(`${cleaned.slice(0, 6)}[\\s-]?${cleaned.slice(6)}`);

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Söktjänsten är inte konfigurerad' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI-tjänsten är inte konfigurerad' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Finding company page on allabolag.se for:', formatted);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `site:allabolag.se "${formatted}"`,
        limit: 5,
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    if (!searchResponse.ok) {
      const errData = await searchResponse.json().catch(() => ({}));
      console.error('Firecrawl search error:', searchResponse.status, JSON.stringify(errData));
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte söka på allabolag just nu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const results = Array.isArray(searchData?.data) ? searchData.data : [];

    const candidate = results.find((item: Record<string, unknown>) => {
      const url = typeof item.url === 'string' ? item.url : '';
      const combined = `${item.title ?? ''} ${item.description ?? ''} ${item.markdown ?? ''}`.replace(/\u00a0/g, ' ');
      return url.includes('allabolag.se') && orgRegex.test(combined);
    }) as Record<string, unknown> | undefined;

    if (!candidate || typeof candidate.url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte hitta företaget på allabolag' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyUrl = candidate.url;
    console.log('Found allabolag candidate URL:', companyUrl);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: companyUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const scrapeData = scrapeResponse.ok ? await scrapeResponse.json() : {};
    const scrapedMarkdown = String(scrapeData?.data?.markdown ?? scrapeData?.markdown ?? '');
    const scrapedHtml = String(scrapeData?.data?.html ?? scrapeData?.html ?? '');

    const sourceText = [
      candidate.title ?? '',
      candidate.description ?? '',
      candidate.markdown ?? '',
      scrapedMarkdown,
      scrapedHtml,
    ]
      .join('\n\n')
      .replace(/\u00a0/g, ' ');

    const hasOrgInSource = orgRegex.test(sourceText);
    console.log('Source validation:', { hasOrgInSource, sourceLength: sourceText.length });

    if (!hasOrgInSource || sourceText.length < 300) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Kunde inte verifiera företagsdata från allabolag just nu. Försök igen om en stund.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Du extraherar företagsdata ENDAST från given text från allabolag.se. Hitta inte på något. Om uppgift saknas: null. Sätt found=false om organisationsnumret inte tydligt matchar.',
          },
          {
            role: 'user',
            content: `Organisationsnummer som måste matcha: ${formatted}\n\nKÄLLTEXT FRÅN ALLABOLAG.SE:\n${sourceText.slice(0, 20000)}\n\nReturnera exakt JSON:\n{"found":true,"orgNumber":"${formatted}","name":"...","address":"...","zipcode":"...","city":"...","phone":"...","signatory":"...","email":"..."}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI extraction error:', aiResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte analysera allabolag-data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tomt analyssvar från tjänsten' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte tolka företagsdata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedOrg = digitsOnly(parsed.orgNumber);
    if (parsed.found !== true || detectedOrg !== cleaned) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte verifiera rätt företag från allabolag' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyName = cleanString(parsed.name);
    if (!companyName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte hitta företagsnamn i allabolag-data' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Company verified:', companyName);

    return new Response(
      JSON.stringify({
        success: true,
        source: 'allabolag.se',
        sourceUrl: companyUrl,
        data: {
          name: companyName,
          address: cleanString(parsed.address),
          phone: cleanString(parsed.phone),
          signatory: cleanString(parsed.signatory),
          city: cleanString(parsed.city),
          zipcode: cleanString(parsed.zipcode),
          email: cleanString(parsed.email),
          orgNumber: cleaned,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Något gick fel vid sökningen' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
