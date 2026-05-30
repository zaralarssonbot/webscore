# Webscore — Audit & Roadmap

Senior review of the codebase against four goals: **Trust, Conversion, SEO, Engagement** — with the ambition of becoming Sweden's leading website-analysis platform.

The highest-ROI, lowest-risk fixes are **already implemented in this code** (build verified passing). The rest is a prioritized backlog.

---

## 🔴 Critical — fixed in this delivery

### 1. Public source-code + credential leak `[SECURITY / TRUST]`
`public/webscore-source.zip` was downloadable at `https://webscore.se/webscore-source.zip`. It contained the full `.git` history **and your `.env`** (Supabase project ID + publishable key).
- **Done:** file deleted from `public/`.
- **You must still do:** rotate the Supabase keys, since they were exposed publicly. Treat the old keys as compromised.

### 2. Site identified itself as "Lovable" to Google & social `[TRUST / SEO]`
`index.html` shipped `author=Lovable`, `twitter:site=@Lovable`, an OG image hosted on a Lovable preview URL, and the title "AI Website Score" (not Webscore).
- **Done:** full `<head>` rewrite — correct Webscore title/description, `author=Webscore`, canonical, complete Open Graph + Twitter cards pointing at `webscore.se`, `theme-color`, font preconnect, and `ProfessionalService` JSON-LD structured data.
- **You should add:** a real `public/og-image.png` (1200×630) — the meta references `/og-image.png` which doesn't exist yet.

### 3. The product was hidden behind a click `[CONVERSION / ENGAGEMENT]`
The hero led with the high-friction "Boka videomöte" as the primary button. The actual product — type a URL, get a score — was a secondary outline button that only *revealed* the input on click. Two clicks to reach your core value.
- **Done:** rewrote `HeroSection`. The URL analyzer is now always visible and is the primary glow CTA ("Analysera nu"). Headline now leads with the hook ("Din hemsida har ett **betyg**"). Booking demoted to a soft text link underneath. This is the single biggest conversion lever on the page.

---

## 🟠 High priority — fixed in this delivery

### 4. No per-page SEO metadata `[SEO]`
Every route (`/`, `/pricing`, `/admin`) shared one static title and description.
- **Done:** added a dependency-free `useDocumentMeta` hook (`src/hooks/useDocumentMeta.ts`) wired into all three pages — unique title/description/canonical per route, and `noindex` on `/admin`.

### 5. No sitemap, admin crawlable `[SEO]`
- **Done:** added `public/sitemap.xml`; rewrote `robots.txt` to disallow `/admin` and reference the sitemap.

### 6. ~27 MB of unoptimized portfolio images `[PERFORMANCE / ENGAGEMENT]`
A dozen portfolio PNGs at 1–2.5 MB each — brutal on mobile, hurts LCP and bounce.
- **Done:** resized + converted all portfolio images to WebP and updated imports. **27.5 MB → 1.7 MB (~94% smaller)**, no visual quality loss at display size. Hero video `preload` reduced from `auto` to `metadata`.

---

## 🟡 Prioritized backlog — not yet done (recommended next)

### A. Server-side rendering / prerendering `[SEO — biggest remaining lever]`
This is a client-rendered SPA: crawlers initially receive an empty `<div id="root">`. For a platform that wants to *rank* in Sweden, this is the ceiling on organic growth. Options, easiest first:
- Add `vite-plugin-prerender` / `react-snap` to prerender `/` and `/pricing` to static HTML at build time. Lowest effort, covers the marketing pages.
- Or migrate the marketing surface to **Next.js** for true SSR + per-route metadata. Bigger lift, best long-term.

### B. Make all proof real `[TRUST]`
The hero stats ("100+ hemsidor skapade", "93% nöjda kunder") and the portfolio cases (Invito, Midnight Grill, Sakai Tokyo, Papa Jun, Nordström) read as placeholders. For a trust-led product whose whole pitch is "we show the problem before we sell," fabricated proof is the one thing that can actually backfire. Replace with real numbers and 2–3 genuine cases (Borent, Nykvarns Städ, Strängnäs Städ) — fewer but true beats many but hollow.

### C. Programmatic SEO content `[SEO — growth engine]`
The leading analyzer in a market wins on content volume. Generate indexable pages: `/analys/[domän]` result pages (shareable, link-worthy), plus guides ("Förbättra din hemsidas hastighet", "Lokal SEO för svenska företag"). This is how you out-rank competitors.

### D. Code-splitting `[PERFORMANCE]`
Main JS bundle is ~871 KB (248 KB gzipped). Lazy-load routes (`React.lazy` on `/admin` and `/pricing`) and split `recharts`/`framer-motion` to cut initial load.

### E. Tame the video payload `[PERFORMANCE — large]`
There is **~110 MB of autoplaying background video**: `hero-bg.mp4` (5.3 MB), `cta-bg.mp4` (2.4 MB), and `public/videos/` (~101 MB, incl. a single 25 MB `whyus-bg.mp4` and a 13 MB `branding-7.mp4`). Autoplaying these destroys mobile load time and data usage. Fix: re-encode to ~720p AV1/VP9, add static poster images, lazy-load below-the-fold videos (`preload="none"` + load on scroll), or replace decorative backgrounds with static images. This is one of the largest performance wins available.

> Note: the video files are **unchanged** by this delivery and are excluded from the attached zip to keep it small — they already exist in your project.

### F. Capture the lead before the score, or gate the full report `[CONVERSION]`
Consider showing the headline score instantly, then asking for an email to unlock the full breakdown (`EmailReportModal` already exists). Turns anonymous analyses into leads.

### G. Analytics & funnel instrumentation `[ENGAGEMENT]`
Add privacy-friendly analytics (Plausible/PostHog) and track: analyses started → completed → email captured → booking. You can't optimize conversion you can't see.

---

## Files changed in this delivery
- `index.html` — head rewrite (branding, meta, canonical, JSON-LD, preconnect)
- `public/webscore-source.zip` — **deleted** (security)
- `public/robots.txt` — disallow `/admin`, sitemap reference
- `public/sitemap.xml` — **new**
- `src/hooks/useDocumentMeta.ts` — **new** per-route SEO hook
- `src/pages/Index.tsx`, `src/pages/Pricing.tsx`, `src/pages/Admin.tsx` — wired meta
- `src/components/HeroSection.tsx` — conversion rework + video preload
- `src/assets/portfolio/*` — PNG → WebP (94% smaller), imports updated in `PortfolioSection.tsx`

Build status: `npm run build` ✓ passing.
