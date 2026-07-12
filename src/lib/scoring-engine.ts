import type { AuditCheck, CategoryScores, PageSpeedData } from "./scan-service";

/**
 * Deterministic scoring engine — the single, explainable source of the Webscore
 * grade. Given the same measured checks + PageSpeed metrics it always returns
 * the exact same score. There is no randomness, no hidden heuristic, and no AI
 * anywhere in this file: the AI may *explain* the score, it can never invent it.
 *
 * How the score is built (fully traceable):
 *   1. Each category has an explicit weight (they sum to 1.00).
 *   2. Inside a category every check is worth explicit points, derived only
 *      from its measured impact (high = 3, medium = 2, low = 1).
 *   3. category score = round(earned ÷ possible × 100).
 *   4. final score  = round(Σ category score × category weight),
 *      re-normalised over the categories that actually had measurable checks.
 *
 * Stability rules (why repeated analyses agree within 0–2 points):
 *   • Network round-trip time is NEVER scored — it measures our connection to
 *     the site, not the site. The raw `load_time` check is excluded.
 *   • PageSpeed's lab score is bucketed to the nearest 5 before it is used, so
 *     Lighthouse run-to-run noise (a few points) cannot move the grade.
 *   • The volatile PSI sub-metric checks (fcp/tbt/cls/si) are not scored
 *     individually; performance is driven by the bucketed PSI score plus the
 *     deterministic HTML signals. This removes the biggest source of drift.
 */

export type Category = keyof CategoryScores;
export type Impact = "high" | "medium" | "low";
export type Effort = "low" | "medium" | "high";

/** Explicit category weights — they MUST sum to 1.00. */
export const CATEGORY_META: { key: Category; label: string; weight: number }[] = [
  { key: "performance", label: "Prestanda", weight: 0.25 },
  { key: "seo", label: "SEO & synlighet", weight: 0.2 },
  { key: "conversion", label: "Användarupplevelse", weight: 0.2 },
  { key: "trust", label: "Förtroende", weight: 0.2 },
  { key: "security", label: "Säkerhet", weight: 0.15 },
];

/** Points a check contributes, from its measured impact. The only mapping used. */
export const IMPACT_POINTS: Record<Impact, number> = { high: 3, medium: 2, low: 1 };

/** Estimated implementation effort per check (for ranked recommendations). */
const EFFORT: Record<string, Effort> = {
  https: "medium", ssl: "medium", canonical: "low", structured_data: "medium",
  og_tags: "low", meta_desc: "low", meta_length: "low", title: "low",
  title_length: "low", heading_hierarchy: "medium", h1: "low", img_alt: "medium",
  viewport: "low", responsive_img: "medium", lazy_load: "medium", page_size: "high",
  scripts: "high", testimonials: "medium", privacy: "low", address: "low",
  social: "low", favicon: "low", phone: "low", email: "low", pricing: "medium",
  cta: "low", cta_count: "low", forms: "medium", cookie_consent: "medium",
  robots: "low", analytics: "low", social_proof: "medium", trust_signals: "medium",
};

/**
 * Checks NOT scored generically:
 *   • load_time — analyzer↔site network time (jitter, not a site property).
 *   • psi_* — volatile lab sub-metrics; performance is scored from the bucketed
 *     PageSpeed score instead, so it can't wobble check-by-check.
 */
const NON_SCORED = new Set(["load_time", "psi_fcp", "psi_tbt", "psi_cls", "psi_si"]);

/** The deterministic HTML signals that make up the performance category. */
const PERF_HTML = ["viewport", "responsive_img", "lazy_load", "page_size", "scripts"];

export interface CheckLine {
  id: string;
  label: string;
  passed: boolean;
  /** Points this check was worth (0 for informational lines like the PSI score). */
  points: number;
  impact: Impact;
  note?: string;
}

export interface CategoryBreakdown {
  key: Category;
  label: string;
  weight: number;
  /** 0–100 category score. */
  score: number;
  earnedPoints: number;
  possiblePoints: number;
  checks: CheckLine[];
}

export interface ScoreBreakdown {
  total: number;
  categories: CategoryBreakdown[];
  categoryScores: CategoryScores;
}

export interface Recommendation {
  id: string;
  category: Category;
  title: string;
  why: string;
  impact: Impact;
  effort: Effort;
  /** Points recoverable by fixing this — used only for deterministic ordering. */
  recoverablePoints: number;
}

export interface Findings {
  strengths: string[];
  weaknesses: string[];
  opportunity: string;
  fixFirst: string | null;
}

/** Bucket the PageSpeed lab score so run-to-run Lighthouse noise can't move it. */
const bucketPsi = (score: number) => Math.round(score / 5) * 5;

const pct = (earned: number, possible: number) => (possible > 0 ? (earned / possible) * 100 : 0);

/** Performance is the bucketed PageSpeed score (70%) + deterministic HTML signals (30%). */
function performanceBreakdown(checks: AuditCheck[], pageSpeed?: PageSpeedData | null): CategoryBreakdown {
  const meta = CATEGORY_META.find((c) => c.key === "performance")!;
  const html = checks.filter((c) => PERF_HTML.includes(c.id));
  const htmlEarned = html.filter((c) => c.passed).reduce((a, c) => a + IMPACT_POINTS[c.impact], 0);
  const htmlPossible = html.reduce((a, c) => a + IMPACT_POINTS[c.impact], 0);
  const htmlPct = htmlPossible > 0 ? pct(htmlEarned, htmlPossible) : 60;

  const lines: CheckLine[] = html.map((c) => ({
    id: c.id, label: c.label, passed: c.passed, points: IMPACT_POINTS[c.impact], impact: c.impact,
  }));

  let score: number;
  if (pageSpeed && typeof pageSpeed.score === "number") {
    const psi = bucketPsi(pageSpeed.score);
    score = Math.round(psi * 0.7 + htmlPct * 0.3);
    lines.unshift({
      id: "psi_score", label: `Google PageSpeed: ${psi}/100`, passed: psi >= 50, points: 0, impact: "high",
      note: "Uppmätt av Google Lighthouse, avrundat till närmaste 5 för stabilitet.",
    });
  } else {
    score = Math.round(htmlPct);
    lines.unshift({
      id: "psi_missing", label: "PageSpeed ej tillgänglig – prestanda uppskattad från sidans kod",
      passed: false, points: 0, impact: "high",
    });
  }

  return {
    key: "performance", label: meta.label, weight: meta.weight,
    score: Math.max(0, Math.min(100, score)), earnedPoints: htmlEarned, possiblePoints: htmlPossible, checks: lines,
  };
}

/** THE score. Pure and deterministic: identical inputs → identical output. */
export function computeScore(input: { checks: AuditCheck[]; pageSpeed?: PageSpeedData | null }): ScoreBreakdown {
  const checks = input.checks ?? [];

  const categories: CategoryBreakdown[] = CATEGORY_META.map((meta) => {
    if (meta.key === "performance") return performanceBreakdown(checks, input.pageSpeed);

    const catChecks = checks.filter((c) => c.category === meta.key && !NON_SCORED.has(c.id));
    let earned = 0;
    let possible = 0;
    const lines: CheckLine[] = catChecks.map((c) => {
      const points = IMPACT_POINTS[c.impact];
      possible += points;
      if (c.passed) earned += points;
      return { id: c.id, label: c.label, passed: c.passed, points, impact: c.impact };
    });
    return {
      key: meta.key, label: meta.label, weight: meta.weight,
      score: Math.round(pct(earned, possible)), earnedPoints: earned, possiblePoints: possible, checks: lines,
    };
  });

  // Weighted total, re-normalised over categories that had measurable checks.
  let weightSum = 0;
  let acc = 0;
  for (const c of categories) {
    const measurable = c.key === "performance" || c.possiblePoints > 0;
    if (measurable) {
      weightSum += c.weight;
      acc += c.score * c.weight;
    }
  }
  const total = weightSum > 0 ? Math.round(acc / weightSum) : 0;

  const categoryScores = {
    seo: categories.find((c) => c.key === "seo")!.score,
    conversion: categories.find((c) => c.key === "conversion")!.score,
    trust: categories.find((c) => c.key === "trust")!.score,
    performance: categories.find((c) => c.key === "performance")!.score,
    security: categories.find((c) => c.key === "security")!.score,
  };

  return { total: Math.max(0, Math.min(100, total)), categories, categoryScores };
}

const impactRank: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
const effortRank: Record<Effort, number> = { low: 0, medium: 1, high: 2 };

/**
 * Ranked recommendations — deterministic, derived only from failed checks.
 * Order: highest business impact first, then easiest effort, then most
 * recoverable points, then id (stable tiebreak).
 */
export function deriveRecommendations(breakdown: ScoreBreakdown): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const cat of breakdown.categories) {
    for (const line of cat.checks) {
      if (line.passed || line.points === 0) continue;
      recs.push({
        id: line.id,
        category: cat.key,
        title: line.label,
        why: `Påverkar ${cat.label.toLowerCase()} — ${line.points} poäng att vinna.`,
        impact: line.impact,
        effort: EFFORT[line.id] ?? "medium",
        recoverablePoints: line.points,
      });
    }
  }
  return recs.sort((a, b) =>
    impactRank[a.impact] - impactRank[b.impact] ||
    effortRank[a.effort] - effortRank[b.effort] ||
    b.recoverablePoints - a.recoverablePoints ||
    a.id.localeCompare(b.id),
  );
}

/**
 * Deterministic, measurement-based findings — the facts the AI summary explains
 * (never generic praise). Strengths = passed high-value checks; weaknesses =
 * failed checks by points; opportunity = the weakest heavily-weighted category.
 */
export function deriveFindings(breakdown: ScoreBreakdown): Findings {
  const passed: CheckLine[] = [];
  const failed: { line: CheckLine; cat: CategoryBreakdown }[] = [];
  for (const cat of breakdown.categories) {
    for (const line of cat.checks) {
      if (line.points === 0) continue;
      if (line.passed) passed.push(line);
      else failed.push({ line, cat });
    }
  }
  passed.sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  failed.sort((a, b) => b.line.points - a.line.points || a.line.id.localeCompare(b.line.id));

  // Weakest category by recoverable points × weight → the biggest opportunity.
  const opp = [...breakdown.categories]
    .filter((c) => c.possiblePoints > 0 || c.key === "performance")
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)[0];

  return {
    strengths: passed.slice(0, 4).map((l) => l.label),
    weaknesses: failed.slice(0, 5).map((f) => f.line.label),
    opportunity: opp ? `Störst att vinna på: ${opp.label} (${opp.score}/100).` : "",
    fixFirst: failed.length ? failed[0].line.label : null,
  };
}
