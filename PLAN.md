# Webscore – Plan

## Strategi

Webscore är en **lead-maskin för byrå-tjänsten**. Verktyget (gratis betyg) är inte
produkten – det är kroken. Produkten är att vi bygger/fixar hemsidan.

**Funnel:** hittar sajten → gratis betyg → ser problemen → "vi fixar det" → bokar/lead.

**Två läckor:**
1. **För lite trafik** in i toppen av tratten.
2. **Besökare konverterar inte** – de får sitt betyg och försvinner.

**Prioritet:** fixa **KONVERTERING först** (Tier 1), bygg **SEO/trafik parallellt**
(Tier 2). Konvertering är billigast att förbättra och multiplicerar all framtida trafik.

**Principer:** ärlighet (inga påhittade siffror/steg/omdömen), restraint > flash,
behåll prestandan.

---

## Nuläge (kartläggning)

### Routes / sidor
| URL | Sida | Innehåll |
|-----|------|----------|
| `/` | Index | Hero + analyzer, marknadssektioner (Services, Process, Portfolio, Video, WhyUs, FinalCTA). Analys-flödet körs **inline** via en state-maskin (`hero` → `loading` → `results`). |
| `/pricing` | Pricing | `PricingSection` + boknings-/lead-modal. |
| `/admin` | Admin | Lead-dashboard. `noindex` + disallow i robots, **men ingen auth-gate** – öppen för den som har URL:en. |
| `*` | NotFound | 404. |

### Analys-/betyg-flödet — **RIKTIGT, inte mock**
1. `createScan` (Supabase insert) + `fetchScreenshot` (Firecrawl) + `fetchGoogleBusiness` körs parallellt.
2. `runAnalysis` → edge-funktionen `analyze-website`:
   - Crawl via **Firecrawl** (fallback: vanlig `fetch`).
   - **Google PageSpeed Insights** (riktig Lighthouse-data: LCP, FCP, TBT, CLS).
   - ~40 **deterministiska** audit-checks → deterministiska kategori- + totalbetyg.
   - **Gemini** (via Lovable AI gateway) skriver affärsspråks-kommentar + genererar konkurrenter.
   - Sparar `ai_reports` + uppdaterar `scans.status`.
3. Returnerar: `score`, `summary`, `categoryScores`, `biggestProblem`, `weaknesses`,
   `strengths`, `opportunity`, `businessImpact`, `quickFix`, `industry`,
   `nearbyCompetitors`, `auditChecks`, `pageInfo`, `pageSpeed`.

**Ärlighets-flaggor i nuvarande flöde:**
- **Betygen är äkta** (deterministiska + riktig PSI-data). Texten är AI-genererad utifrån verkliga fynd.
- **Konkurrenter:** `scan-service` försöker `find-competitors` (riktig Firecrawl-sök) först, men **faller tillbaka på AI-genererade konkurrenter** → kan vara påhittade. Måste verifieras/märkas.
- **`webscore.se` har hårdkodat betyg 89** (demo-override).

### Befintliga funktioner
- **Lead-fångst: FINNS.** `LeadCaptureModal`, `EmailReportModal` och `RemediationFlow` skickar alla till `submitLead` → Supabase `leads`. `lead-service` har status-flöde, `markBookingClicked`, `autoScheduleFollowUp`.
- **Bokning: FINNS INTE (på riktigt).** "Boka"-CTA:er öppnar lead-formulär (`LeadCaptureModal` / `RemediationFlow`) och markerar intent som `meeting_booked`. Ingen riktig kalender (Cal.com/Calendly saknas).
- **E-postrapport: SKICKAS INTE.** `generateEmailReport` bygger HTML som sedan **slängs** (`_emailHtml` används aldrig). Endast lead fångas. UI:t säger "Skicka via e-post" → vilseledande idag.
- **Betald rapport (60 kr): FINNS INTE.** Ingen Stripe/checkout/betalning någonstans.
- **PDF: FINNS INTE.**
- **Konto/inloggning: FINNS INTE.** Admin saknar auth.
- **`RemediationFlow`** (huvudsaklig konverteringsväg): problem → paket → kontakt (org.nr-uppslag via `lookup-company`) → bekräftelse → `submitLead`.

### Tjänste-/pris-/case-sidor
- **Tjänster:** endast sektioner på startsidan (`ServicesSection`: Hemsidor, SEO, Branding). **Inga dedikerade sidor.**
- **Priser:** `/pricing` (`PricingSection`) + paket i `RemediationFlow` (Starter 995 / Pro 1495 / Premium 1995 kr/mån).
- **Case:** `PortfolioSection` på startsidan (bilder). **Inga dedikerade case-sidor/URL:er.**

### SEO idag
- **Ren SPA** (Vite + React Router `BrowserRouter`). **Ingen SSR/prerendering.**
- `index.html` har statiska meta + OG + JSON-LD (`ProfessionalService`).
- `useDocumentMeta` sätter title/description/canonical/OG **klient-sidan** per route (efter att JS körts). Crawlers som inte kör JS ser bara `index.html`-defaults för **alla** routes.
- `robots.txt` (allow `/`, disallow `/admin`), `sitemap.xml` (endast `/` och `/pricing`).
- **Resultat-vyer saknar URL** (in-memory state) → går inte att dela eller indexera.

---

## TIER 1 — Konverterings-motorn (först)

- **Betyg→lead-brygga i resultat-vyn** `[FINNS – förstärk]`
  Resultat-vyn finns och visar problem, men säljbryggan är spretig (flera CTA:er,
  e-post + boka + paket om vartannat). Skärp till **ett** visceralt problem-narrativ
  ("det här kostar dig kunder") med **EN** tydlig primär-CTA placerad i smärtan,
  direkt efter `BiggestProblemCard`. Sekundära CTA:er nedtonas.

- **Lead-fångst: gate:a full rapport bakom mail** `[NY]`
  Idag visas hela rapporten direkt och e-post-modalen är frivillig (och skickar inget).
  Visa betyg + största problemet fritt, **gate:a** detaljerad breakdown / åtgärdslista
  bakom e-post. Då blir lead-fångsten en naturlig del av värdet, inte en sidoknapp.
  *Beroende:* e-postutskick måste börja fungera (se öppen punkt) – annars är gaten oärlig.

- **Direktbokning (Cal.com/Calendly-embed)** `[NY]`
  "Boka"-knapparna leder idag till lead-formulär, inte en kalender. Lägg in en riktig
  boknings-embed så varma leads kan boka direkt. Behåll lead-loggning (`markBookingClicked`).
  *Beroende:* ägaren väljer verktyg (se öppen punkt).

- **Tjänste-sidor: `/tjanster/hemsidor`, `/tjanster/seo`, `/tjanster/branding` + pris-sida** `[FINNS – förstärk]`
  Innehållet finns som startsides-sektioner; `/pricing` finns. Bryt ut till **dedikerade,
  indexerbara sidor** med egen URL, djupare copy och egen CTA. Ger både konvertering
  (säljsidor att länka leads till) och SEO-yta.

- **Mätning: Plausible eller PostHog** `[NY]`
  Ingen analytics finns idag. Utan mätning är all konverteringsoptimering gissning.
  Plausible = lättvikt/integritet/SEO-vänligt; PostHog = funnels + session-insikt.
  Mät: analys-start, analys-klar, lead, boknings-klick.

---

## TIER 2 — Trafik-motorn (parallellt)

- **SEO-grund / prerendering** `[NY]`
  Idag ren SPA → crawlers ser samma meta för alla routes och tomt innehåll utan JS.
  **Lättaste vägen (förslag, bygg ej än):** lägg till **`vite-plugin-prerender` / `vite-react-ssg`**
  för statisk pre-rendering av kända marknads-routes (`/`, `/pricing`, kommande tjänste-/
  programmatiska sidor) vid build. Behåller SPA-känslan men ger crawlers riktig HTML +
  korrekta per-route-taggar. Tyngre alternativ (Next.js-migrering) sparas till senare.

- **Delbara, indexerbara rapport-sidor med egen URL** `[NY]`
  Resultat lever bara i minnet idag. Ge varje scan en permanent URL (`/rapport/:scanId`
  eller slug på domän). Delbart (viral-loop: "kolla betyget på er sajt") + indexerbart
  long-tail-innehåll. Kräver att rapport-sidan kan rendera från sparad scan-data.

- **Programmatiska sidor: "webbanalys [stad]", "hemsida [bransch]"** `[NY]`
  Skapa mallbaserade landningssidor per stad/bransch för long-tail-sök. Bygger på
  tjänste-sidsmallen + prerendering. Endast med **äkta** innehåll – inga tomma doorway-sidor.

- **Blogg/guider** `[NY]`
  Innehållsmotor för topp-av-tratten ("så förbättrar du din hemsidas synlighet").
  Markdown-baserat, prerenderat. Lägst prio inom Tier 2.

---

## TIER 3 — Senare

- **Konto/dashboard** `[NY]` – inloggning, spara analyser, hantera leads (ersätter dagens öppna `/admin`).
- **Följ betyg över tid** `[NY]` – återkommande scans, trendgraf → retention + uppföljnings-krok.
- **Jämför mot konkurrent** `[NY]` – bygger på riktig konkurrentdata (kräver att `find-competitors` är pålitlig, inte AI-fallback).
- **PDF-rapport** `[NY]` – nedladdningsbar/bifogad rapport. Kan kombineras med betald nivå om det blir aktuellt.

---

## Kräver ägaren (öppna punkter)

- [ ] **1–3 riktiga kunder/omdömen** att visa i case/social proof. **Inga påhittade** – portfolio/omdömen måste vara verkliga och godkända av kunden.
- [ ] **Val av bokningsverktyg** (Cal.com vs Calendly) inkl. konto + länk/embed-nyckel.
- [ ] **Beslut om e-postutskick** – välj leverantör (Resend / SendGrid / Lovable Email) + avsändardomän (DNS/SPF/DKIM). Krävs innan rapport gate:as bakom mail.
- [ ] **Konkurrent-data:** acceptera vi AI-genererade konkurrenter (och **märk dem tydligt som uppskattningar**), eller kräv riktig `find-competitors`-data? Påverkar Tier 1-trovärdighet och Tier 3-jämförelse.
- [ ] **Analytics-val:** Plausible vs PostHog (+ ev. cookie/GDPR-banner beroende på val).
- [ ] **Auth till `/admin`** – idag öppen. Bekräfta om det är OK kortsiktigt eller ska gate:as omgående.
