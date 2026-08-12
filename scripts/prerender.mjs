/**
 * Build-time prerendering (Väg A) — real headless Chromium snapshot.
 *
 * Runs AFTER `vite build`. Serves the built `dist/` with Vite's preview server
 * (SPA fallback), loads each static marketing route in headless Chromium, waits
 * for the real app to render (networkidle + real text in #root, so lazy routes
 * are never captured as their Suspense spinner), then serializes the resulting
 * DOM — including the per-route <head> that useDocumentMeta sets client-side —
 * to dist/<route>/index.html.
 *
 * Why a real browser and not renderToString: no SSR guards needed, so the
 * analysis flow, WebGL background, localStorage (supabase) and lazy routes all
 * run exactly as in production. Playwright/Chromium is a devDependency and is
 * used at build time only — nothing here ships in the client bundle.
 */
import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

// Indexable, statically-known routes. /admin is intentionally excluded (noindex).
const ROUTES = [
  "/",
  "/analys",
  "/pricing",
  "/tjanster/hemsidor",
  "/tjanster/intranat",
  "/tjanster/webbappar",
  "/tjanster/seo",
  "/tjanster/branding",
  "/tjanster/drift",
  "/guider",
  "/guider/vad-kostar-en-hemsida",
  "/guider/behover-foretaget-ett-intranat",
  "/guider/darfor-syns-du-inte-pa-google",
  "/integritetspolicy",
];

async function run() {
  const server = await preview({
    root: ROOT,
    preview: { port: 4188, strictPort: true },
  });
  const base = server.resolvedUrls.local[0].replace(/\/$/, "");

  // Launching Chromium is the one step that fails on hosts missing system libs
  // (e.g. libnspr4.so). If it can't launch, warn and exit successfully — the
  // built SPA is already complete and the deployment must not fail here.
  let browser;
  try {
    browser = await chromium.launch();
  } catch (launchErr) {
    console.warn("⚠ Prerender: Chromium could not launch — skipping SEO prerender (SPA fallback used).");
    console.warn("  Reason:", launchErr?.message ?? String(launchErr));
    await new Promise((resolve) => server.httpServer.close(resolve));
    process.exit(0);
  }

  const snapshots = {};

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      const url = base + route;
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

      // Wait for the real route content — not the empty Suspense fallback.
      // The lazy fallback (<div class="min-h-screen bg-background"/>) has no
      // text, so requiring substantial text in #root guarantees the route's
      // chunk has loaded and rendered.
      await page.waitForFunction(
        () => {
          const r = document.getElementById("root");
          return !!r && (r.textContent || "").trim().length > 200;
        },
        { timeout: 20000 },
      );
      // Let useDocumentMeta's effect flush the <head> for this route.
      await page.waitForFunction(() => /Webscore/.test(document.title), { timeout: 10000 });

      const html = await page.evaluate(() => {
        // The snapshot must capture CONTENT, not this machine's device class.
        // Prerendering runs in a desktop, fine-pointer headless browser, so the
        // homepage's decorative WebGL field mounts and Vite injects
        // <link rel="modulepreload"> for the LatticeScene + three.js chunks.
        // Serialising those would ship a dead 1280x720 canvas to everyone and
        // make phones — which never run WebGL — download ~126 KB gzip of
        // three.js they will never execute. The client decides whether to mount
        // the field; the static HTML must stay neutral.
        document
          .querySelectorAll('link[rel="modulepreload"][href*="vendor-three"], link[rel="modulepreload"][href*="LatticeScene"]')
          .forEach((el) => el.remove());
        document.querySelectorAll(".imm-canvas-layer canvas").forEach((el) => el.remove());
        return "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
      });
      snapshots[route] = html;
      console.log(`  ✓ rendered ${route} (${(html.length / 1024).toFixed(1)} KB)`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }

  // Write only after all routes are captured, so every snapshot is taken from
  // the pristine built dist (no half-written index.html polluting SPA fallback).
  for (const [route, html] of Object.entries(snapshots)) {
    const outPath = route === "/" ? join(DIST, "index.html") : join(DIST, route, "index.html");
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
    console.log(`  → wrote ${outPath.replace(ROOT + "/", "")}`);
  }

  console.log(`\nPrerendered ${ROUTES.length} routes.`);
}

// Prerender is an OPTIONAL, build-time SEO enhancement. The SPA (dist/index.html
// from `vite build`) is the production fallback and works fully without it, so a
// prerender problem must NEVER fail the deployment. On Vercel the runtime lacks
// the system libraries headless Chromium needs (e.g. libnspr4.so), so we skip it
// there rather than crash — only the actual `vite build` may fail the build.
if (process.env.VERCEL) {
  console.warn("⚠ Prerender skipped on Vercel — the SPA build is used as-is (deployment unaffected).");
  process.exit(0);
}

run().then(
  () => process.exit(0),
  (err) => {
    // Never fail the build here — `vite build` already succeeded; prerender is optional.
    console.warn("⚠ Prerender step failed — continuing without prerendered snapshots (SPA build is intact).");
    console.warn("  Reason:", err?.message ?? String(err));
    process.exit(0);
  },
);
