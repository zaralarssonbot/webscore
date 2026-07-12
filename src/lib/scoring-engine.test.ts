import { describe, it, expect } from "vitest";
import type { AuditCheck, PageSpeedData } from "./scan-service";
import {
  computeScore,
  deriveRecommendations,
  deriveFindings,
  CATEGORY_META,
} from "./scoring-engine";

// A representative measured page: a mix of passed/failed checks across all five
// categories, plus a set of PageSpeed metrics.
const CHECKS: AuditCheck[] = [
  { id: "title", label: "Sidtitel", category: "seo", passed: true, detail: "", impact: "high" },
  { id: "meta_desc", label: "Metabeskrivning", category: "seo", passed: true, detail: "", impact: "medium" },
  { id: "canonical", label: "Canonical-tagg", category: "seo", passed: false, detail: "", impact: "medium" },
  { id: "structured_data", label: "Strukturerad data", category: "seo", passed: false, detail: "", impact: "medium" },
  { id: "og_tags", label: "Open Graph", category: "seo", passed: true, detail: "", impact: "medium" },
  { id: "phone", label: "Telefonnummer", category: "conversion", passed: true, detail: "", impact: "high" },
  { id: "email", label: "E-post", category: "conversion", passed: false, detail: "", impact: "medium" },
  { id: "pricing", label: "Prisinformation", category: "conversion", passed: false, detail: "", impact: "medium" },
  { id: "ssl", label: "SSL", category: "trust", passed: true, detail: "", impact: "high" },
  { id: "testimonials", label: "Kundomdömen", category: "trust", passed: false, detail: "", impact: "high" },
  { id: "privacy", label: "Integritetspolicy", category: "trust", passed: true, detail: "", impact: "medium" },
  { id: "https", label: "HTTPS", category: "security", passed: true, detail: "", impact: "high" },
  { id: "cookie_consent", label: "Cookie-samtycke", category: "security", passed: false, detail: "", impact: "high" },
  { id: "viewport", label: "Mobil viewport", category: "performance", passed: true, detail: "", impact: "high" },
  { id: "responsive_img", label: "Responsiva bilder", category: "performance", passed: true, detail: "", impact: "low" },
  { id: "lazy_load", label: "Lazy loading", category: "performance", passed: false, detail: "", impact: "low" },
  // Volatile inputs that MUST NOT influence the score:
  { id: "load_time", label: "Laddtid (nätverk)", category: "performance", passed: false, detail: "", impact: "high" },
  { id: "psi_tbt", label: "TBT", category: "performance", passed: false, detail: "", impact: "high" },
];

const PS: PageSpeedData = { score: 62, fcp: 1700, lcp: 2400, tbt: 180, cls: 0.05, speedIndex: 3000, interactive: 3500 };

describe("scoring engine — determinism & explainability", () => {
  it("weights sum to exactly 1.00", () => {
    const sum = CATEGORY_META.reduce((a, c) => a + c.weight, 0);
    expect(Number(sum.toFixed(5))).toBe(1);
  });

  it("produces byte-identical output across 10 consecutive runs (the validation table)", () => {
    const rows = Array.from({ length: 10 }, (_, i) => {
      const b = computeScore({ checks: CHECKS, pageSpeed: PS });
      const recs = deriveRecommendations(b).map((r) => r.id).join(">");
      return {
        run: i + 1,
        total: b.total,
        perf: b.categoryScores.performance,
        seo: b.categoryScores.seo,
        ux: b.categoryScores.conversion,
        trust: b.categoryScores.trust,
        sec: b.categoryScores.security,
        recOrder: recs,
      };
    });
    console.table(rows);
    const first = JSON.stringify(rows[0]);
    for (const r of rows) expect(JSON.stringify({ ...r, run: 1 })).toBe(first);
  });

  it("every point is traceable: final = Σ(category score × weight), renormalised", () => {
    const b = computeScore({ checks: CHECKS, pageSpeed: PS });
    let wsum = 0, acc = 0;
    for (const c of b.categories) {
      const measurable = c.key === "performance" || c.possiblePoints > 0;
      if (measurable) { wsum += c.weight; acc += c.score * c.weight; }
    }
    expect(b.total).toBe(Math.round(acc / wsum));
    // Each category score is exactly earned ÷ possible (non-performance cats).
    for (const c of b.categories) {
      if (c.key === "performance") continue;
      expect(c.score).toBe(Math.round((c.earnedPoints / c.possiblePoints) * 100));
    }
  });

  it("network time and volatile PSI sub-metrics never affect the score", () => {
    const withNoise = CHECKS.map((c) =>
      c.id === "load_time" || c.id === "psi_tbt" ? { ...c, passed: !c.passed } : c,
    );
    const a = computeScore({ checks: CHECKS, pageSpeed: PS });
    const bNoisy = computeScore({ checks: withNoise, pageSpeed: PS });
    expect(bNoisy.total).toBe(a.total);
  });

  it("PageSpeed lab noise within a bucket cannot move the grade at all", () => {
    const a = computeScore({ checks: CHECKS, pageSpeed: { ...PS, score: 60 } });
    const b = computeScore({ checks: CHECKS, pageSpeed: { ...PS, score: 62 } }); // same 5-bucket
    expect(b.total).toBe(a.total);
  });

  it("even a bucket-boundary PageSpeed swing stays within the 0–2 tolerance", () => {
    const a = computeScore({ checks: CHECKS, pageSpeed: { ...PS, score: 62 } }); // → 60
    const b = computeScore({ checks: CHECKS, pageSpeed: { ...PS, score: 64 } }); // → 65
    expect(Math.abs(b.total - a.total)).toBeLessThanOrEqual(2);
  });

  it("recommendations are ranked high-impact first, then easiest effort", () => {
    const recs = deriveRecommendations(computeScore({ checks: CHECKS, pageSpeed: PS }));
    for (let i = 1; i < recs.length; i++) {
      const order = { high: 0, medium: 1, low: 2 } as const;
      expect(order[recs[i - 1].impact]).toBeLessThanOrEqual(order[recs[i].impact]);
    }
    // Only failed, scored checks become recommendations.
    expect(recs.every((r) => r.recoverablePoints > 0)).toBe(true);
  });

  it("findings are measurement-based (no generic praise)", () => {
    const f = deriveFindings(computeScore({ checks: CHECKS, pageSpeed: PS }));
    expect(f.strengths).toContain("HTTPS");
    expect(f.weaknesses).toContain("Kundomdömen");
    expect(f.fixFirst).toBeTruthy();
  });
});
