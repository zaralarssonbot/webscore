// Pure, dependency-free templated audit used when the AI commentary step
// can't run (no GEMINI_API_KEY) or fails (401/403/429/timeout/bad response).
//
// The core service — deterministic category scores and the audit checks — is
// always returned. The AI only ever writes prose; when it's unavailable we
// synthesise a plain, honest summary straight from the checks so the analysis
// never dies just because the AI text failed.
//
// This file intentionally has NO Deno/remote imports so it can be unit-tested
// from the Vitest (Node) test suite.

export interface FallbackCheck {
  id: string;
  label: string;
  category: string;
  passed: boolean;
  detail: string;
  impact: "high" | "medium" | "low";
}

export interface FallbackScores {
  seo: number;
  conversion: number;
  trust: number;
  performance: number;
  security: number;
  total: number;
}

export interface FallbackAudit {
  industry: string;
  business_summary: string;
  overall_summary: string;
  biggest_problem: string;
  weaknesses: string[];
  strengths: string[];
  business_impact: string[];
  biggest_opportunity: string;
  quick_fix: string;
  nearby_competitors: unknown[];
}

const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function buildFallbackAudit(
  domain: string,
  scores: FallbackScores,
  checks: FallbackCheck[],
): FallbackAudit {
  const bySeverity = (a: FallbackCheck, b: FallbackCheck) =>
    (IMPACT_RANK[a.impact] ?? 9) - (IMPACT_RANK[b.impact] ?? 9);

  const failed = checks.filter((c) => !c.passed).sort(bySeverity);
  const passed = checks.filter((c) => c.passed).sort(bySeverity);

  const band = scores.total >= 85 ? "high" : scores.total >= 55 ? "mid" : "low";
  const overall_summary =
    band === "high"
      ? `${domain} presterar starkt med ett totalbetyg på ${scores.total}/100. Grunden är god – det handlar mest om finjustering.`
      : band === "mid"
        ? `${domain} får ett totalbetyg på ${scores.total}/100. Det finns en fungerande grund, men flera konkreta brister håller tillbaka resultatet.`
        : `${domain} får ett totalbetyg på ${scores.total}/100, vilket är lågt. Flera grundläggande delar saknas och begränsar förmågan att få kunder.`;

  const weaknesses = failed.slice(0, 5).map((c) => `${c.label}: ${c.detail}`);
  const strengths = passed.slice(0, 4).map((c) => `${c.label}: ${c.detail}`);

  const biggest_problem = failed.length
    ? `${failed[0].label}: ${failed[0].detail}`
    : "Inga större brister hittades i den automatiska kontrollen.";
  const biggest_opportunity = failed.length
    ? `Åtgärda "${failed[0].label}" – den brist som påverkar resultatet mest.`
    : "Fortsätt underhålla sidans goda grund.";

  return {
    industry: "Ej fastställd (AI-analys ej tillgänglig)",
    business_summary: `Automatisk genomgång av ${domain} baserad på ${checks.length} tekniska kontroller.`,
    overall_summary,
    biggest_problem,
    weaknesses: weaknesses.length
      ? weaknesses
      : ["Inga tydliga svagheter upptäcktes i den automatiska kontrollen."],
    strengths: strengths.length
      ? strengths
      : ["Inga tydliga styrkor upptäcktes i den automatiska kontrollen."],
    business_impact: [
      "Detta är en automatisk sammanfattning – den utförligare AI-förklaringen kunde inte genereras just nu.",
      "Betygen och de tekniska kontrollerna nedan är fullt giltiga och baserade på riktig data.",
      "Kör gärna analysen igen senare för en mer detaljerad genomgång.",
    ],
    biggest_opportunity,
    quick_fix: biggest_opportunity,
    nearby_competitors: [],
  };
}
