# Webscore — Implementation Plan (for Claude Code)

Companion to `ROADMAP.md`. This file phases the **remaining** work into executable units with acceptance criteria. Work top-down. Run `npm run build` after every task; do not advance a phase until its acceptance criteria pass.

---

## Phase 0 — Verify baseline (do this first)

Do not trust this list blindly — **verify each against the actual repo**, because the prior fixes may or may not have been re-imported.

| # | Item | How to verify | If missing |
|---|------|---------------|------------|
| 1 | Source-zip leak removed | `public/webscore-source.zip` absent | delete it |
| 2 | `index.html` debranded + JSON-LD | no "Lovable" string; has `application/ld+json` | re-apply head from ROADMAP |
| 3 | Hero analyzer is primary | no `showInput` in `HeroSection.tsx`; form always rendered | re-apply hero rework |
| 4 | Per-route meta | `src/hooks/useDocumentMeta.ts` exists, wired in Index/Pricing/Admin | re-add hook |
| 5 | Sitemap + admin disallow | `public/sitemap.xml` exists; robots disallows `/admin` | re-add |
| 6 | Portfolio on WebP | `src/assets/portfolio/*.webp`, no `*.png` | reconvert |

**Also in Phase 0:** create the missing `public/og-image.png` (1200×630) referenced by `index.html` meta. If no brand asset exists, generate a clean dark card with the Webscore wordmark + "Få betyg på din hemsida".

Acceptance: `npm run build` passes; all 6 items confirmed present; `og-image.png` exists.

---

## Phase 1 — Performance hardening (autonomous, highest ROI)

Pure engineering, no business decisions needed. Target: mobile Lighthouse Performance ≥ 90, initial JS < 200 KB gzipped.

**1.1 — Tame the ~109 MB video payload** (`ROADMAP` item E)
- Inventory: `public/hero-bg.mp4` (5.3 MB), `public/cta-bg.mp4` (2.4 MB), `public/videos/*` (~101 MB; `whyus-bg.mp4` is 25 MB, `branding-7.mp4` 13 MB).
- For each autoplay background video: set `preload="none"`, add a `poster` still (extract frame 0 as WebP), and lazy-load via `IntersectionObserver` (only attach `src` when the section nears viewport).
- Re-encode all videos to 720p, CRF ~30, H.264 + a VP9/AV1 alt. Use `ffmpeg`. Aim for each background video < 1.5 MB.
- Components touched: `HeroSection.tsx`, `FinalCTASection`/`cta`, `VideoShowcaseSection.tsx`, `ProcessSection.tsx`, `WhyUsSection.tsx`.
- Acceptance: total video payload < 15 MB; no autoplay video blocks first paint; below-fold videos load on scroll.

**1.2 — Route-level code-splitting** (`ROADMAP` item D)
- Convert `/admin` and `/pricing` routes in `App.tsx` to `React.lazy` + `Suspense`.
- Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split `framer-motion`, `recharts`, and Radix into vendor chunks.
- Acceptance: main entry chunk < 200 KB gzipped (currently ~248 KB); `/admin` (with `recharts`) only loads on that route.

**1.3 — Image/asset hygiene**
- Confirm all portfolio images use `loading="lazy"` and explicit `width`/`height` to avoid CLS.
- Acceptance: no layout shift on portfolio; Lighthouse CLS < 0.1.

---

## Phase 2 — SEO foundation (biggest organic lever)

**2.1 — Prerender marketing routes** (`ROADMAP` item A)
- This is an SPA: crawlers get an empty `#root`. Add build-time prerendering for `/` and `/pricing` (e.g. `vite-plugin-prerender` or `react-snap`), OR scope a migration of the marketing surface to Next.js if prerender proves brittle. Start with the lighter prerender approach.
- Acceptance: `curl` of the built `/` and `/pricing` returns fully-rendered HTML with h1, copy, and meta present (not just `<div id="root">`).

**2.2 — Programmatic result/content pages** (`ROADMAP` item C) — scaffold only this phase
- Add a route `/analys/:domain` that renders a shareable, indexable result page from a completed scan.
- Add a `/guider` section scaffold for SEO articles (hastighet, lokal SEO, konvertering).
- Make `sitemap.xml` generated at build from the route list instead of hand-maintained.
- Acceptance: `/analys/example.se` renders server-visible HTML; sitemap auto-includes new routes.

---

## Phase 3 — Conversion & measurement

**3.1 — Lead capture on the score** (`ROADMAP` item F)
- Show the headline score instantly; gate the full breakdown behind an email (reuse `EmailReportModal` + `lead-service`).
- Acceptance: an analysis can convert to a captured lead without leaving the page.

**3.2 — Funnel analytics** (`ROADMAP` item G)
- Add privacy-friendly analytics (Plausible or PostHog). Track: analysis_started → analysis_completed → email_captured → booking_clicked.
- Acceptance: events fire and are visible in the analytics dashboard.

---

## Owner-blocked (needs Billy's input, not Claude Code's invention)

**B — Make all proof real** (`ROADMAP` item B): the hero stats ("100+", "93%") and portfolio cases must be replaced with **real** numbers/cases. Claude Code should NOT fabricate these. Flag for Billy to supply; until then, leave a clear `TODO` and prefer fewer-but-true (Borent, Nykvarns Städ, Strängnäs Städ).

---

## Working rules for Claude Code
- Run `npm run build` after each task; keep the build green.
- Commit per task with a clear message (`perf: lazy-load background videos`, etc.).
- Don't fabricate metrics, testimonials, or cases.
- Don't commit `.env` or secrets. If Supabase keys were ever public, remind Billy to rotate them.
- Stop and ask before any large architectural change (e.g. Next.js migration).
