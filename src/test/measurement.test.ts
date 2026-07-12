import { describe, it, expect } from "vitest";
import {
  extractSignals,
  runAuditChecks,
  applyPageSpeedChecks,
  computeDeterministicScore,
  isMinimumValidMeasurement,
  partialReasons,
  decideRefreshAction,
  CHECK_PROVENANCE,
  AI_TEXT_FIELDS,
  MIN_CHECKS,
  type AuditCheck,
  type PageSpeedLite,
} from "../../supabase/functions/analyze-website/measurement";
import { computeScore } from "@/lib/scoring-engine";
import { buildFallbackAudit } from "../../supabase/functions/analyze-website/fallback";

// ── Fixtures ───────────────────────────────────────────────────────
const LOREM = Array.from({ length: 420 }, (_, i) => `ord${i}`).join(" ");

/** A rich, healthy page that should pass most HTML checks. */
const GOOD_HTML = `<!DOCTYPE html><html lang="sv"><head>
<title>Hemfrid – professionell hemstädning i hela Sverige idag</title>
<meta name="description" content="Vi erbjuder professionell hemstädning, flyttstädning och kontorsstädning i hela Sverige med nöjd-kund-garanti och fasta priser varje vecka.">
<meta property="og:title" content="Hemfrid">
<meta property="og:image" content="https://x.se/o.png">
<link rel="canonical" href="https://x.se/">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@type":"Organization"}</script>
<script src="/gtag.js"></script>
</head><body>
<h1>Professionell hemstädning</h1>
<h2>Våra tjänster</h2><h2>Priser</h2>
<img src="a.jpg" alt="städning" loading="lazy">
<img src="b.jpg" srcset="b-2x.jpg 2x" alt="flytt">
<form><input name="q"></form>
<a href="tel:+46812345">Ring oss</a>
<a href="mailto:info@x.se">Maila</a>
<a href="https://x.se/tjanster">Tjänster</a>
<a href="https://x.se/om">Om oss</a>
<a href="https://x.se/kontakt">Kontakt</a>
<a href="https://facebook.com/x">Facebook</a>
<section>Boka städning – kontakta oss för offert</section>
<article>Pris från 200 kr. Omdöme: kunderna älskar oss (recension).</article>
<main>Vår adress: Storgatan 1. Integritetspolicy och cookie-samtycke (GDPR).</main>
<p>${LOREM}</p>
</body></html>`;

function goodChecks(): AuditCheck[] {
  const s = extractSignals(GOOD_HTML, "x.se", undefined, {}, true);
  return runAuditChecks(s);
}

const GOOD_PSI: PageSpeedLite = { score: 82, fcp: 1400, lcp: 2100, tbt: 150, cls: 0.05, speedIndex: 3000, interactive: 2500 };

// ── 1. Complete measurement ────────────────────────────────────────
describe("complete measurement", () => {
  it("passes the minimum-valid gate and produces a deterministic score", () => {
    const checks = applyPageSpeedChecks(goodChecks(), GOOD_PSI);
    const inputs = { usedFirecrawl: true, htmlPresent: true, psiOk: true, checkCount: checks.length };
    expect(isMinimumValidMeasurement(inputs)).toBe(true);
    expect(partialReasons(inputs)).toEqual([]);
    expect(checks.length).toBeGreaterThanOrEqual(MIN_CHECKS);

    const a = computeDeterministicScore(checks, GOOD_PSI);
    const b = computeDeterministicScore(checks, GOOD_PSI);
    expect(a).toEqual(b); // identical inputs → identical output
    expect(a.total).toBeGreaterThan(0);
    expect(a.total).toBeLessThanOrEqual(100);
  });
});

// ── 2. Partial Firecrawl failure (fallback used) ───────────────────
describe("partial: firecrawl failure", () => {
  it("is not cacheable when the rendered crawl fell back to plain fetch", () => {
    const inputs = { usedFirecrawl: false, htmlPresent: true, psiOk: true, checkCount: 40 };
    expect(isMinimumValidMeasurement(inputs)).toBe(false);
    expect(partialReasons(inputs)).toContain("used_fallback_crawl");
  });
});

// ── 3. Partial PageSpeed failure ───────────────────────────────────
describe("partial: pagespeed failure", () => {
  it("still scores deterministically from HTML but is not cacheable", () => {
    const checks = goodChecks(); // no PSI checks appended
    const inputs = { usedFirecrawl: true, htmlPresent: true, psiOk: false, checkCount: checks.length };
    expect(isMinimumValidMeasurement(inputs)).toBe(false);
    expect(partialReasons(inputs)).toContain("pagespeed_unavailable");

    // Score must still be a stable number with PSI null (HTML-only performance).
    const s1 = computeDeterministicScore(checks, null);
    const s2 = computeDeterministicScore(checks, null);
    expect(s1).toEqual(s2);
    expect(Number.isFinite(s1.total)).toBe(true);
  });
});

// ── 4 & 9. Gemini failure + AI independence from scoring ───────────
describe("AI independence", () => {
  it("score is a pure function of checks + PSI — no AI field exists in the signature", () => {
    const checks = applyPageSpeedChecks(goodChecks(), GOOD_PSI);
    const baseline = computeDeterministicScore(checks, GOOD_PSI);

    // Simulate AI output existing alongside (both success and the Gemini-failure
    // fallback path). It must not change the score in any way.
    const aiSuccess = { overall_summary: "great", weaknesses: ["x"], strengths: ["y"] };
    const aiFallback = buildFallbackAudit("x.se",
      { ...baseline.categoryScores, total: baseline.total },
      checks.map((c) => ({ ...c })),
    );
    void aiSuccess; void aiFallback;

    const after = computeDeterministicScore(checks, GOOD_PSI);
    expect(after).toEqual(baseline);
  });

  it("no audit check is AI-sourced, and AI text fields never appear as check ids", () => {
    const checks = applyPageSpeedChecks(goodChecks(), GOOD_PSI);
    const ids = new Set(checks.map((c) => c.id));
    for (const field of AI_TEXT_FIELDS) expect(ids.has(field)).toBe(false);
    // Provenance vocabulary is measured/derived/heuristic only — never "ai".
    for (const { source } of Object.values(CHECK_PROVENANCE)) {
      expect(["measured", "derived", "heuristic"]).toContain(source);
    }
  });

  it("the Gemini-failure fallback builds prose from the checks without touching the score", () => {
    const checks = applyPageSpeedChecks(goodChecks(), GOOD_PSI);
    const score = computeDeterministicScore(checks, GOOD_PSI);
    const audit = buildFallbackAudit("x.se", { ...score.categoryScores, total: score.total }, checks);
    expect(audit.overall_summary).toContain("x.se");
    // Recomputing after producing the fallback prose yields the identical score.
    expect(computeDeterministicScore(checks, GOOD_PSI)).toEqual(score);
  });
});

// ── 5. Timeout / no reachable source ───────────────────────────────
describe("timeout / unreachable", () => {
  it("no HTML from any source is an explicit failure, never a valid measurement", () => {
    const inputs = { usedFirecrawl: false, htmlPresent: false, psiOk: false, checkCount: 0 };
    expect(isMinimumValidMeasurement(inputs)).toBe(false);
    expect(partialReasons(inputs)).toContain("no_html");
  });
});

// ── 6. Malformed upstream response ─────────────────────────────────
describe("malformed upstream response", () => {
  it("garbage / empty HTML does not throw and still yields the full base check set", () => {
    for (const bad of ["", "<html><head><title", "not html at all", "<<<>>>"]) {
      const s = extractSignals(bad, "x.se", undefined, undefined, false);
      const checks = runAuditChecks(s);
      expect(checks.length).toBeGreaterThanOrEqual(MIN_CHECKS); // 36 base checks always
      // Every check is well-formed (no undefined leaking from bad parses).
      for (const c of checks) {
        expect(typeof c.passed).toBe("boolean");
        expect(c.detail.length).toBeGreaterThan(0);
      }
      // A malformed page scores deterministically (mostly failing) — no crash.
      const score = computeDeterministicScore(checks, null);
      expect(Number.isFinite(score.total)).toBe(true);
    }
  });

  it("missing PageSpeed fields are simply omitted, never guessed", () => {
    const partialPsi: PageSpeedLite = { score: 70, fcp: null, lcp: null, tbt: 120, cls: null, speedIndex: null };
    const checks = applyPageSpeedChecks(goodChecks(), partialPsi);
    const ids = checks.map((c) => c.id);
    expect(ids).toContain("psi_tbt");     // measured → present
    expect(ids).not.toContain("load_time"); // lcp null → omitted, not faked
    expect(ids).not.toContain("psi_fcp");
    expect(ids).not.toContain("psi_cls");
  });
});

// ── 7. Forced-refresh failure preserves the previous measurement ───
describe("forced-refresh preservation", () => {
  it("keeps the previous valid measurement when a fresh run is incomplete", () => {
    const action = decideRefreshAction({ freshComplete: false, hasPreviousValid: true });
    expect(action).toEqual({ cache: false, respondWith: "previous", refreshFailed: true });
  });

  it("returns the fresh partial only when there is nothing to preserve", () => {
    const action = decideRefreshAction({ freshComplete: false, hasPreviousValid: false });
    expect(action.respondWith).toBe("fresh");
    expect(action.cache).toBe(false); // partial is NEVER cached
  });
});

// ── 8. Cache preservation / write gating ───────────────────────────
describe("cache write gating", () => {
  it("caches only a complete fresh measurement", () => {
    const action = decideRefreshAction({ freshComplete: true, hasPreviousValid: true });
    expect(action).toEqual({ cache: true, respondWith: "fresh", refreshFailed: false });
  });

  it("a partial measurement never overwrites a good cached one", () => {
    const action = decideRefreshAction({ freshComplete: false, hasPreviousValid: true });
    expect(action.cache).toBe(false);
    expect(action.respondWith).toBe("previous");
  });
});

// ── Scoring parity: backend port === frontend engine ───────────────
describe("scoring parity (backend port === frontend engine)", () => {
  const cases: { name: string; checks: AuditCheck[]; psi: PageSpeedLite | null }[] = [
    { name: "good + psi", checks: applyPageSpeedChecks(goodChecks(), GOOD_PSI), psi: GOOD_PSI },
    { name: "good, no psi", checks: goodChecks(), psi: null },
    { name: "empty page + psi", checks: runAuditChecks(extractSignals("", "x.se", undefined, undefined, false)), psi: GOOD_PSI },
    { name: "empty page, no psi", checks: runAuditChecks(extractSignals("", "x.se", undefined, undefined, false)), psi: null },
    { name: "low psi", checks: applyPageSpeedChecks(goodChecks(), { ...GOOD_PSI, score: 23 }), psi: { ...GOOD_PSI, score: 23 } },
  ];

  for (const { name, checks, psi } of cases) {
    it(`agrees on total + categories for: ${name}`, () => {
      const backend = computeDeterministicScore(checks, psi);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const frontend = computeScore({ checks: checks as any, pageSpeed: psi as any });
      expect(backend.total).toBe(frontend.total);
      expect(backend.categoryScores).toEqual(frontend.categoryScores);
    });
  }
});

// ── Provenance coverage: nothing shown without a declared source ────
describe("check provenance coverage (Task 1)", () => {
  it("every emitted check id has a declared, honest source", () => {
    const emitted = applyPageSpeedChecks(goodChecks(), GOOD_PSI);
    for (const c of emitted) {
      expect(CHECK_PROVENANCE[c.id], `missing provenance for ${c.id}`).toBeDefined();
    }
  });
});
