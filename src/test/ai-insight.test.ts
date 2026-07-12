import { describe, it, expect } from "vitest";
import {
  assembleInsight,
  buildDeterministicInsight,
  validateAiProse,
  computeEvidence,
  buildGroundedPrompt,
  toFlatSummary,
  AI_REPORT_VERSION,
  PROMPT_VERSION,
  type InsightContext,
  type InsightCheck,
  type RawAi,
  type AiInsightMeta,
} from "../../supabase/functions/analyze-website/ai-insight";

const CHECKS: InsightCheck[] = [
  { id: "ssl", label: "SSL-certifikat (HTTPS)", category: "trust", passed: false, detail: "Saknas – ej säker", impact: "high" },
  { id: "meta_desc", label: "Meta-beskrivning", category: "seo", passed: false, detail: "Saknas", impact: "high" },
  { id: "h1", label: "H1-rubrik", category: "seo", passed: false, detail: "Saknas", impact: "high" },
  { id: "forms", label: "Kontaktformulär", category: "conversion", passed: false, detail: "Inget formulär", impact: "high" },
  { id: "title", label: "Sidtitel (title-tagg)", category: "seo", passed: true, detail: "Finns", impact: "high" },
  { id: "viewport", label: "Mobilanpassning (viewport)", category: "performance", passed: true, detail: "Finns", impact: "high" },
  { id: "favicon", label: "Favicon", category: "trust", passed: true, detail: "Finns", impact: "low" },
  { id: "robots", label: "Robots meta-tagg", category: "security", passed: false, detail: "Saknas", impact: "low" },
];

const CTX: InsightContext = {
  domain: "x.se",
  checks: CHECKS,
  categoryScores: { seo: 40, conversion: 30, trust: 20, performance: 80, security: 50 },
  total: 44,
  signals: { title: "X AB", h1: "Välkommen" },
};

const META: Omit<AiInsightMeta, "aiGenerated" | "validationErrors" | "repairedSections" | "fallbackReason"> = {
  aiReportVersion: AI_REPORT_VERSION, promptVersion: PROMPT_VERSION, model: "gemini-2.5-flash",
  analysisVersion: "2026-07-12b", scoringVersion: "engine-1", reportId: null, createdAt: "2026-07-12T00:00:00Z",
};

const validRaw: RawAi = {
  industry: "Städtjänster",
  business_summary: "Ett litet städföretag.",
  executive_summary: "Sidan får 44/100 och har flera konkreta brister att åtgärda.",
  biggest_problem: "Kontaktformulär saknas, vilket gör det svårt för besökare att höra av sig.",
  business_impact: ["Färre besökare hör av sig när formulär saknas.", "Utan SSL kan besökare tveka."],
  quick_fix: "Lägg till en meta-beskrivning för sidan.",
  strengths: ["Sidtitel finns och är tydlig.", "Mobilanpassning fungerar."],
  weaknesses: ["SSL saknas.", "Meta-beskrivning saknas.", "H1 saknas."],
  opportunity: "Mest att vinna på SEO-kontrollerna.",
};

const allCheckIds = new Set(CHECKS.map((c) => c.id));

// ── 1. AI success ──────────────────────────────────────────────────
describe("AI success", () => {
  it("uses the model prose, marks aiGenerated, no repairs", () => {
    const ins = assembleInsight(validRaw, CTX, META);
    expect(ins.meta.aiGenerated).toBe(true);
    expect(ins.meta.validationErrors).toEqual([]);
    expect(ins.meta.repairedSections).toEqual([]);
    expect(ins.executiveSummary.text).toBe(validRaw.executive_summary);
    expect(ins.biggestProblem.text).toBe(validRaw.biggest_problem);
    expect(ins.industry).toBe("Städtjänster");
    expect(ins.meta.promptVersion).toBe(PROMPT_VERSION);
    expect(ins.meta.aiReportVersion).toBe(AI_REPORT_VERSION);
  });
});

// ── 2. AI timeout / no output → deterministic fallback ─────────────
describe("AI timeout / null", () => {
  it("returns a COMPLETE deterministic report, aiGenerated false", () => {
    const ins = assembleInsight(null, CTX, META, "gemini_timeout");
    expect(ins.meta.aiGenerated).toBe(false);
    expect(ins.meta.fallbackReason).toBe("gemini_timeout");
    for (const s of [ins.executiveSummary.text, ins.biggestProblem.text, ins.quickFix.text, ins.opportunity.text]) {
      expect(s.length).toBeGreaterThan(0);
    }
    expect(ins.businessImpact.items.length).toBeGreaterThan(0);
    expect(ins.strengths.items.length).toBeGreaterThan(0);
    expect(ins.weaknesses.items.length).toBeGreaterThan(0);
  });
});

// ── 3. AI malformed JSON → treated as null → fallback ──────────────
describe("AI malformed JSON", () => {
  it("falls back with the given reason", () => {
    const ins = assembleInsight(null, CTX, META, "malformed_json");
    expect(ins.meta.aiGenerated).toBe(false);
    expect(ins.meta.fallbackReason).toBe("malformed_json");
  });
});

// ── 4. Unsupported claims (traffic / ranking / backlink / revenue) ─
describe("AI unsupported claim", () => {
  const cases: { name: string; raw: RawAi; err: string }[] = [
    { name: "traffic", raw: { ...validRaw, business_impact: ["Detta ökar trafiken med 300 besökare per månad."] }, err: "unsupported_traffic_claim:businessImpact" },
    { name: "ranking", raw: { ...validRaw, quick_fix: "Detta tar dig till plats 1 på Google." }, err: "unsupported_ranking_claim:quickFix" },
    { name: "backlink", raw: { ...validRaw, opportunity: "Bygg fler bakåtlänkar för att ranka." }, err: "unsupported_backlink_claim:opportunity" },
    { name: "revenue", raw: { ...validRaw, business_impact: ["Detta ger 5000 kr mer i intäkter."] }, err: "unsupported_revenue_claim:businessImpact" },
  ];
  for (const { name, raw, err } of cases) {
    it(`${name} claim is flagged and the section repaired from measured findings`, () => {
      const ins = assembleInsight(raw, CTX, META);
      expect(ins.meta.validationErrors).toContain(err);
      const section = err.split(":")[1];
      expect(ins.meta.repairedSections).toContain(section);
      // aiGenerated stays true (only one section repaired), report still complete.
      expect(ins.meta.aiGenerated).toBe(true);
    });
  }
});

// ── 5. Contradiction (praises something that failed) ───────────────
describe("AI contradiction", () => {
  it("praising SSL while ssl FAILED is caught and strengths repaired", () => {
    const raw: RawAi = { ...validRaw, strengths: ["Du har ett starkt SSL-certifikat och säker anslutning."] };
    const ins = assembleInsight(raw, CTX, META);
    expect(ins.meta.validationErrors).toContain("contradiction:strengths:ssl");
    expect(ins.meta.repairedSections).toContain("strengths");
    // Repaired strengths come from the passed checks, never claiming ssl.
    expect(ins.strengths.items.join(" ")).not.toMatch(/ssl/i);
  });
});

// ── 6. Empty section ───────────────────────────────────────────────
describe("empty section", () => {
  it("an empty AI section is repaired deterministically (never shown empty)", () => {
    const raw: RawAi = { ...validRaw, executive_summary: "" };
    const ins = assembleInsight(raw, CTX, META);
    expect(ins.meta.validationErrors).toContain("empty_section:executiveSummary");
    expect(ins.executiveSummary.text.length).toBeGreaterThan(0);
  });
});

// ── 7. Evidence mapping ────────────────────────────────────────────
describe("evidence mapping", () => {
  it("every section's evidenceCheckIds reference real checks", () => {
    const ins = assembleInsight(validRaw, CTX, META);
    const sections = [ins.executiveSummary, ins.biggestProblem, ins.businessImpact, ins.quickFix, ins.strengths, ins.weaknesses, ins.opportunity];
    for (const s of sections) for (const id of s.evidenceCheckIds) expect(allCheckIds.has(id)).toBe(true);
  });
  it("biggest-problem evidence is the single highest-severity failed check", () => {
    const ev = computeEvidence(CHECKS);
    // highest severity failed, tie broken by id → forms/h1/meta_desc/ssl (all high) → 'forms'
    expect(ev.biggestProblem).toEqual(["forms"]);
  });
  it("strengths evidence references only PASSED checks", () => {
    const ev = computeEvidence(CHECKS);
    for (const id of ev.strengths) expect(CHECKS.find((c) => c.id === id)!.passed).toBe(true);
  });
});

// ── 8. Fallback report completeness ────────────────────────────────
describe("fallback report", () => {
  it("deterministic insight is complete and carries evidence", () => {
    const ins = buildDeterministicInsight(CTX, { ...META, aiGenerated: false, validationErrors: [], repairedSections: [] });
    expect(ins.biggestProblem.text.length).toBeGreaterThan(0);
    expect(ins.biggestProblem.evidenceCheckIds.length).toBeGreaterThan(0);
    expect(ins.industry).toContain("mall");
  });
});

// ── 9. Score independence ──────────────────────────────────────────
describe("AI score independence", () => {
  it("a wrong score claim is rejected and repaired", () => {
    const raw: RawAi = { ...validRaw, executive_summary: "Sidan borde egentligen få 95/100." };
    const ins = assembleInsight(raw, CTX, META);
    expect(ins.meta.validationErrors.some((e) => e.startsWith("score_claim_mismatch"))).toBe(true);
  });
  it("the insight exposes NO score field and evidence is independent of AI wording", () => {
    const ins = assembleInsight(validRaw, CTX, META);
    expect("score" in ins).toBe(false);
    expect("total" in ins).toBe(false);
    // Same evidence regardless of what the model wrote.
    expect(ins.biggestProblem.evidenceCheckIds).toEqual(computeEvidence(CTX.checks).biggestProblem);
  });
});

// ── 10. Stability / immutability ───────────────────────────────────
describe("stability & historical immutability", () => {
  it("10 assemblies of the same input yield identical evidence + repair decisions", () => {
    const runs = Array.from({ length: 10 }, () => assembleInsight(validRaw, CTX, META));
    const first = JSON.stringify({
      ev: runs[0].biggestProblem.evidenceCheckIds,
      repaired: runs[0].meta.repairedSections,
      flat: toFlatSummary(runs[0]),
    });
    for (const r of runs) {
      expect(JSON.stringify({ ev: r.biggestProblem.evidenceCheckIds, repaired: r.meta.repairedSections, flat: toFlatSummary(r) })).toBe(first);
    }
  });
  it("a saved insight passed through toFlatSummary is stable (historical render is fixed)", () => {
    const ins = assembleInsight(validRaw, CTX, META);
    expect(toFlatSummary(ins)).toEqual(toFlatSummary(ins));
  });
});

// ── Grounding: prompt contains NO raw page body text ───────────────
describe("grounding", () => {
  it("the prompt is built from checks + signals only, never page body text", () => {
    const { user } = buildGroundedPrompt(CTX);
    expect(user).toContain("[ssl]");
    expect(user).toContain("Totalbetyg: 44/100");
    // The context has no textContentPreview and the prompt never invents one.
    expect(user).not.toMatch(/textContentPreview|lorem|<html|<body/i);
  });
});
