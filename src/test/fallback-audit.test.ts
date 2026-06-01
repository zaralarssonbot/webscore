import { describe, it, expect } from "vitest";
// The edge function's templated-fallback builder is a pure, dependency-free
// module so it can be exercised here without the Deno runtime.
import {
  buildFallbackAudit,
  type FallbackCheck,
  type FallbackScores,
} from "../../supabase/functions/analyze-website/fallback";

const scores: FallbackScores = {
  seo: 52,
  conversion: 40,
  trust: 60,
  performance: 70,
  security: 64,
  total: 55,
};

const checks: FallbackCheck[] = [
  { id: "title", label: "Sidtitel", category: "seo", passed: false, detail: "Saknas helt", impact: "high" },
  { id: "meta_desc", label: "Meta-beskrivning", category: "seo", passed: false, detail: "Saknas", impact: "high" },
  { id: "viewport", label: "Mobilanpassning", category: "performance", passed: false, detail: "Saknas", impact: "high" },
  { id: "favicon", label: "Favicon", category: "trust", passed: false, detail: "Saknas", impact: "low" },
  { id: "h1", label: "H1-rubrik", category: "seo", passed: true, detail: '"Välkommen"', impact: "high" },
  { id: "ssl", label: "SSL", category: "trust", passed: true, detail: "Aktiv", impact: "high" },
];

describe("buildFallbackAudit (AI-failure path)", () => {
  const audit = buildFallbackAudit("example.com", scores, checks);

  it("returns every field the response shape requires", () => {
    for (const key of [
      "industry",
      "business_summary",
      "overall_summary",
      "biggest_problem",
      "weaknesses",
      "strengths",
      "business_impact",
      "biggest_opportunity",
      "quick_fix",
      "nearby_competitors",
    ]) {
      expect(audit).toHaveProperty(key);
    }
  });

  it("never invents competitors", () => {
    expect(audit.nearby_competitors).toEqual([]);
  });

  it("surfaces the highest-impact failed check as the biggest problem", () => {
    // high-impact failures sort first; "Sidtitel" is the first high failure
    expect(audit.biggest_problem).toContain("Sidtitel");
  });

  it("builds weaknesses from failed checks and strengths from passed ones", () => {
    expect(audit.weaknesses.join(" ")).toContain("Mobilanpassning");
    expect(audit.strengths.join(" ")).toContain("SSL");
    // a passed check must never show up as a weakness
    expect(audit.weaknesses.join(" ")).not.toContain("SSL: Aktiv");
  });

  it("reflects the real total score in the summary, not an invented one", () => {
    expect(audit.overall_summary).toContain("55/100");
  });

  it("is honest that the AI text is unavailable", () => {
    expect(audit.industry.toLowerCase()).toContain("ej tillgänglig");
  });

  it("degrades gracefully when there are no checks", () => {
    const empty = buildFallbackAudit("foo.se", { ...scores, total: 90 }, []);
    expect(empty.weaknesses.length).toBeGreaterThan(0);
    expect(empty.strengths.length).toBeGreaterThan(0);
    expect(empty.business_summary).toContain("0 tekniska kontroller");
  });
});
