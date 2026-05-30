# Webscore

Webscore analyserar en hemsida och ger ett tydligt betyg på synlighet, förtroende och
konvertering – och visar konkret vad som kan förbättras. Sajten är också en lead-motor för
byråtjänsten: vi bygger, får det att synas och håller det igång.

## Teknik

- **Vite** + **React 18** + **TypeScript**, **React Router**, **Tailwind CSS** (hand-rollat designsystem).
- **Three.js** generativ WebGL-bakgrund (med CSS-fallback och `prefers-reduced-motion`).
- **Supabase** (databas + edge functions) för analys, lead-fångst och företagsuppslag.
- **Bygg-tids-prerendering** av statiska routes för SEO (headless Chromium, `scripts/prerender.mjs`).

## Utveckling

```bash
npm install
npm run dev          # utvecklingsserver
npm run build        # produktionsbygge + prerendering av statiska routes
npm run build:client # enbart vite build (utan prerendering)
npm run test         # vitest
npm run lint         # eslint
```

## Struktur

- `src/pages` – routes (start, /pricing, /tjanster/:slug, /guider, /guider/:slug, /admin).
- `src/components` – UI-komponenter och sektioner.
- `src/content` – filbaserat innehåll (guider, priser).
- `supabase/functions` – edge functions för analys m.m.
- `scripts/prerender.mjs` – genererar statisk HTML per route vid build.
