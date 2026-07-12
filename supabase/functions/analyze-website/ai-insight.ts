// Pure, dependency-free AI-insight core for the analyze-website summary phase.
//
// The AI writes PROSE ONLY. Everything that must be trustworthy — which measured
// checks each section is grounded in (evidenceCheckIds), what counts as an
// invalid claim, and the deterministic template used when the model fails or
// misbehaves — lives here so it can be unit-tested with zero Deno/network deps.
//
// Hard rules enforced here:
//   • AI never sets a score, a category score, a pass/fail, or a priority.
//   • Every section carries evidenceCheckIds computed DETERMINISTICALLY from the
//     measured checks — never from the model — so evidence is always stable.
//   • Invalid AI output (invented metrics, wrong scores, contradictions, generic
//     praise, empty sections) is rejected and repaired from measured findings.

export const AI_REPORT_VERSION = "ai-1";
export const PROMPT_VERSION = "prompt-2026-07-12b";

export type Impact = "high" | "medium" | "low";
export type Category = "seo" | "conversion" | "trust" | "performance" | "security";

export interface InsightCheck {
  id: string;
  label: string;
  category: Category;
  passed: boolean;
  detail: string;
  impact: Impact;
}

export interface CategoryScores {
  seo: number; conversion: number; trust: number; performance: number; security: number;
}

/** Everything the AI step is allowed to see — sanitized, no raw page text. */
export interface InsightContext {
  domain: string;
  checks: InsightCheck[];
  categoryScores: CategoryScores;
  total: number;
  /** Short structured signals for industry framing — NOT raw page body text. */
  signals: { title?: string; metaDesc?: string; h1?: string; h2s?: string[] };
}

export interface AiSectionText { text: string; evidenceCheckIds: string[] }
export interface AiSectionList { items: string[]; evidenceCheckIds: string[] }

export interface AiInsightMeta {
  aiReportVersion: string;
  promptVersion: string;
  model: string;
  analysisVersion: string;
  scoringVersion: string;
  reportId?: string | null;
  aiGenerated: boolean;          // false ⇒ full deterministic fallback
  fallbackReason?: string;
  validationErrors: string[];
  repairedSections: string[];
  createdAt?: string;
}

export interface AiInsight {
  industry: string;
  businessSummary: string;
  executiveSummary: AiSectionText;
  biggestProblem: AiSectionText;
  businessImpact: AiSectionList;
  quickFix: AiSectionText;
  strengths: AiSectionList;
  weaknesses: AiSectionList;
  opportunity: AiSectionText;
  meta: AiInsightMeta;
}

const IMPACT_POINTS: Record<Impact, number> = { high: 3, medium: 2, low: 1 };
const IMPACT_RANK: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
// Low-effort, high-clarity fixes → the pool the "quick fix" is drawn from.
const QUICK_IDS = new Set(["title", "meta_desc", "meta_length", "title_length", "og_tags", "canonical", "viewport", "favicon", "phone", "email", "robots", "h1"]);
const CAT_LABEL: Record<Category, string> = {
  seo: "SEO & synlighet", conversion: "användarupplevelse", trust: "förtroende",
  performance: "prestanda", security: "säkerhet",
};

const bySeverity = (a: InsightCheck, b: InsightCheck) =>
  IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || a.id.localeCompare(b.id);

function failed(checks: InsightCheck[]) { return checks.filter((c) => !c.passed).sort(bySeverity); }
function passed(checks: InsightCheck[]) { return checks.filter((c) => c.passed).sort(bySeverity); }

/** The category with the most recoverable (failed) points — the biggest opportunity. */
function weakestCategory(checks: InsightCheck[]): Category | null {
  const pts: Record<string, number> = {};
  for (const c of checks) if (!c.passed) pts[c.category] = (pts[c.category] ?? 0) + IMPACT_POINTS[c.impact];
  const entries = Object.entries(pts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.length ? (entries[0][0] as Category) : null;
}

// ── Deterministic evidence (Task 1) ────────────────────────────────
// Evidence is computed from the MEASURED checks, never from the model, so it is
// identical on every run for the same analysis.
export interface EvidenceMap {
  executiveSummary: string[];
  biggestProblem: string[];
  businessImpact: string[];
  quickFix: string[];
  strengths: string[];
  weaknesses: string[];
  opportunity: string[];
}

export function computeEvidence(checks: InsightCheck[]): EvidenceMap {
  const f = failed(checks);
  const p = passed(checks);
  const weakCat = weakestCategory(checks);
  const quick = f.find((c) => QUICK_IDS.has(c.id)) ?? f[0];
  const oppChecks = weakCat ? f.filter((c) => c.category === weakCat).slice(0, 4) : f.slice(0, 3);

  const topFailed = f.slice(0, 5).map((c) => c.id);
  const topPassed = p.slice(0, 4).map((c) => c.id);

  return {
    biggestProblem: f.length ? [f[0].id] : [],
    quickFix: quick ? [quick.id] : [],
    weaknesses: topFailed,
    strengths: topPassed,
    opportunity: oppChecks.map((c) => c.id),
    businessImpact: f.slice(0, 3).map((c) => c.id),
    // A representative spread: the lead problem + next weaknesses + a strength.
    executiveSummary: Array.from(new Set([...f.slice(0, 3).map((c) => c.id), ...(p[0] ? [p[0].id] : [])])),
  };
}

// ── Grounded prompt (Task 1) — sanitized analysis only, NO page body text ──
export function buildGroundedPrompt(ctx: InsightContext, leadDecision?: string): { system: string; user: string } {
  const f = failed(ctx.checks);
  const p = passed(ctx.checks);
  const line = (c: InsightCheck) => `- [${c.id}] ${c.label} (${c.category}, ${c.impact}): ${c.detail}`;

  const system = `Du är en svensk webbanalytiker som förklarar en REDAN BERÄKNAD analys i enkelt affärsspråk.

ABSOLUTA REGLER:
- Betygen är fasta. Du får ALDRIG ändra, räkna om eller hitta på siffror.
- Använd ENDAST de kontroller som listas nedan. Nämn inget som inte finns där.
- Hitta ALDRIG på trafik, besökarantal, Google-placeringar, bakåtlänkar, intäkter eller kronor.
- Ingen generisk beröm ("snygg sida", "proffsig design"). Var konkret och koppla allt till kontrollerna.
- Skriv kort, tydligt och affärsnära. Svenska.`;

  const user = `Domän: ${ctx.domain}
Totalbetyg: ${ctx.total}/100
Kategoribetyg: SEO ${ctx.categoryScores.seo}, Användarupplevelse ${ctx.categoryScores.conversion}, Förtroende ${ctx.categoryScores.trust}, Prestanda ${ctx.categoryScores.performance}, Säkerhet ${ctx.categoryScores.security}

Sidsignaler (för branschtolkning): titel="${ctx.signals.title ?? ""}", h1="${ctx.signals.h1 ?? ""}", beskrivning="${(ctx.signals.metaDesc ?? "").slice(0, 160)}"

UNDERKÄNDA kontroller:
${f.map(line).join("\n") || "(inga)"}

GODKÄNDA kontroller:
${p.map(line).join("\n") || "(inga)"}
${leadDecision ? `\nViktigaste åtgärd (deterministiskt vald): ${leadDecision}` : ""}

Skriv en analys och anropa verktyget "website_insight". Alla textfält på svenska. Referera bara till kontrollerna ovan.`;

  return { system, user };
}

// ── Validation (Task 4) ────────────────────────────────────────────
const RE_TRAFFIC = /\b\d[\d\s.,]*\s*(besökare|besök|visitors?|klick|clicks?|sessioner|sessions?|träffar)\b/i;
const RE_TRAFFIC_PCT = /\b\d+\s*%\s*(mer|fler|ökad|ökning|högre)\s*(trafik|besökare|besök|klick)/i;
const RE_RANK = /(plats\s*#?\s*\d|position\s*\d|topp\s*\d+|#\s*\d+\s*(på|on)\s*google|förstasidan?\s*(på|i)\s*google|first\s+page\s+of\s+google|rank(?:as|ing|ad|ade)\b)/i;
const RE_BACKLINK = /\b(backlinks?|bakåtlänkar?|länkprofil|domain\s*authority|domänauktoritet)\b/i;
const RE_REVENUE = /(\b\d[\d\s.,]*\s*(kr|kronor|sek|usd|eur|euro|€|\$)\b|\b\d+\s*%\s*(mer|ökad|ökning|högre)\s*(försäljning|intäkt|omsättning|vinst|revenue|sales))/i;
const RE_GENERIC = /\b(snygg|proffsig design|professionell design|modern design|fräsch design|läcker design|ser (bra|fin|proffsig) ut|bra jobbat|tilltalande design)\b/i;
const RE_SCORE = /(\d{1,3})\s*(?:\/\s*100|\s*poäng)/gi;

/** Keyword patterns that assert a check's subject IS present (for contradiction). */
const PRESENCE_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "ssl", re: /\b(ssl|https|kryptera[dt]|krypteri ng|säker anslutning)\b/i },
  { id: "https", re: /\b(https|ssl|kryptera[dt])\b/i },
  { id: "meta_desc", re: /\bmeta-?beskrivning(en)?\b/i },
  { id: "testimonials", re: /\b(omdömen|recensioner|kundomdömen)\b/i },
  { id: "forms", re: /\b(kontaktformulär|formulär)\b/i },
  { id: "phone", re: /\b(telefonnummer|ringa)\b/i },
];

export interface ValidationOutcome {
  errors: string[];
  repairSections: string[]; // section keys needing deterministic repair
}

const SECTION_TEXT = (s: AiSectionText | undefined) => (s?.text ?? "").trim();
const SECTION_JOIN = (s: AiSectionList | undefined) => (s?.items ?? []).join(" ").trim();

/** Validate the AI prose against the measured analysis. Pure and deterministic. */
export function validateAiProse(ai: Partial<AiInsight>, ctx: InsightContext): ValidationOutcome {
  const errors: string[] = [];
  const repair = new Set<string>();
  const allowedScores = new Set<number>([ctx.total, ctx.categoryScores.seo, ctx.categoryScores.conversion, ctx.categoryScores.trust, ctx.categoryScores.performance, ctx.categoryScores.security]);
  const failedIds = new Set(ctx.checks.filter((c) => !c.passed).map((c) => c.id));

  const sections: { key: string; text: string }[] = [
    { key: "executiveSummary", text: SECTION_TEXT(ai.executiveSummary) },
    { key: "biggestProblem", text: SECTION_TEXT(ai.biggestProblem) },
    { key: "businessImpact", text: SECTION_JOIN(ai.businessImpact) },
    { key: "quickFix", text: SECTION_TEXT(ai.quickFix) },
    { key: "strengths", text: SECTION_JOIN(ai.strengths) },
    { key: "weaknesses", text: SECTION_JOIN(ai.weaknesses) },
    { key: "opportunity", text: SECTION_TEXT(ai.opportunity) },
  ];

  for (const { key, text } of sections) {
    // Empty section → repair.
    if (!text) { errors.push(`empty_section:${key}`); repair.add(key); continue; }

    // Invented metrics we do not measure.
    if (RE_TRAFFIC.test(text) || RE_TRAFFIC_PCT.test(text)) { errors.push(`unsupported_traffic_claim:${key}`); repair.add(key); }
    if (RE_RANK.test(text)) { errors.push(`unsupported_ranking_claim:${key}`); repair.add(key); }
    if (RE_BACKLINK.test(text)) { errors.push(`unsupported_backlink_claim:${key}`); repair.add(key); }
    if (RE_REVENUE.test(text)) { errors.push(`unsupported_revenue_claim:${key}`); repair.add(key); }

    // Score tampering: any NN/100 or NN poäng that isn't a real score.
    for (const m of text.matchAll(RE_SCORE)) {
      const n = parseInt(m[1], 10);
      if (!allowedScores.has(n)) { errors.push(`score_claim_mismatch:${key}:${n}`); repair.add(key); break; }
    }
  }

  // Generic praise in strengths / summary.
  if (RE_GENERIC.test(SECTION_JOIN(ai.strengths))) { errors.push("generic_praise:strengths"); repair.add("strengths"); }
  if (RE_GENERIC.test(SECTION_TEXT(ai.executiveSummary))) { errors.push("generic_praise:executiveSummary"); repair.add("executiveSummary"); }

  // Contradiction: praising something that actually FAILED.
  const strengthsText = SECTION_JOIN(ai.strengths);
  for (const { id, re } of PRESENCE_PATTERNS) {
    if (failedIds.has(id) && re.test(strengthsText)) { errors.push(`contradiction:strengths:${id}`); repair.add("strengths"); }
  }

  return { errors, repairSections: [...repair] };
}

// ── Deterministic templates (Task 3) ───────────────────────────────
const band = (total: number) => (total >= 85 ? "high" : total >= 55 ? "mid" : "low");

function detExecutiveSummary(ctx: InsightContext): string {
  const f = failed(ctx.checks);
  const b = band(ctx.total);
  const lead = f[0];
  if (b === "high") return `${ctx.domain} presterar starkt med ett totalbetyg på ${ctx.total}/100. Grunden är god – det handlar mest om finjustering${lead ? `, t.ex. ${lead.label.toLowerCase()}` : ""}.`;
  if (b === "mid") return `${ctx.domain} får ${ctx.total}/100. Det finns en fungerande grund, men flera konkreta brister håller tillbaka resultatet${lead ? ` – tydligast ${lead.label.toLowerCase()}` : ""}.`;
  return `${ctx.domain} får ${ctx.total}/100, vilket är lågt. Flera grundläggande delar saknas${lead ? `, framför allt ${lead.label.toLowerCase()}` : ""} och begränsar förmågan att få kunder.`;
}
function detBiggestProblem(ctx: InsightContext): string {
  const f = failed(ctx.checks);
  return f.length ? `${f[0].label}: ${f[0].detail}` : "Inga större brister hittades i den automatiska kontrollen.";
}
function detBusinessImpact(ctx: InsightContext): string[] {
  const f = failed(ctx.checks).slice(0, 3);
  if (!f.length) return ["Sidans grund är god – inga tydliga brister drar ner kundtillväxten just nu."];
  return f.map((c) => {
    const cat = CAT_LABEL[c.category];
    return `Brist i ${cat} (${c.label.toLowerCase()}) gör det svårare att omvandla besökare till kunder.`;
  });
}
function detQuickFix(ctx: InsightContext): string {
  const f = failed(ctx.checks);
  const q = f.find((c) => QUICK_IDS.has(c.id)) ?? f[0];
  return q ? `Åtgärda "${q.label}" – ${q.detail}` : "Fortsätt underhålla sidans goda grund.";
}
function detStrengths(ctx: InsightContext): string[] {
  const p = passed(ctx.checks).slice(0, 4);
  return p.length ? p.map((c) => `${c.label}: ${c.detail}`) : ["Inga tydliga styrkor upptäcktes i den automatiska kontrollen."];
}
function detWeaknesses(ctx: InsightContext): string[] {
  const f = failed(ctx.checks).slice(0, 5);
  return f.length ? f.map((c) => `${c.label}: ${c.detail}`) : ["Inga tydliga svagheter upptäcktes i den automatiska kontrollen."];
}
function detOpportunity(ctx: InsightContext): string {
  const cat = weakestCategory(ctx.checks);
  if (!cat) return "Fortsätt underhålla sidans goda grund.";
  return `Störst att vinna på: ${CAT_LABEL[cat]}. Åtgärda de underkända kontrollerna där för snabbast effekt.`;
}

export function buildDeterministicInsight(ctx: InsightContext, meta: AiInsightMeta): AiInsight {
  const ev = computeEvidence(ctx.checks);
  return {
    industry: "Ej fastställd (mall)",
    businessSummary: `Automatisk genomgång av ${ctx.domain} baserad på ${ctx.checks.length} tekniska kontroller.`,
    executiveSummary: { text: detExecutiveSummary(ctx), evidenceCheckIds: ev.executiveSummary },
    biggestProblem: { text: detBiggestProblem(ctx), evidenceCheckIds: ev.biggestProblem },
    businessImpact: { items: detBusinessImpact(ctx), evidenceCheckIds: ev.businessImpact },
    quickFix: { text: detQuickFix(ctx), evidenceCheckIds: ev.quickFix },
    strengths: { items: detStrengths(ctx), evidenceCheckIds: ev.strengths },
    weaknesses: { items: detWeaknesses(ctx), evidenceCheckIds: ev.weaknesses },
    opportunity: { text: detOpportunity(ctx), evidenceCheckIds: ev.opportunity },
    meta,
  };
}

// ── Assemble (Task 3 + 4) ──────────────────────────────────────────
// Raw AI shape (flat text fields the tool returns). Any field may be missing.
export interface RawAi {
  industry?: string;
  business_summary?: string;
  executive_summary?: string;
  biggest_problem?: string;
  business_impact?: string[];
  quick_fix?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunity?: string;
}

/**
 * Turn raw AI output (or nothing) into a complete, validated AiInsight.
 * - null/failed raw ⇒ full deterministic fallback.
 * - per-section validation failures ⇒ that section is repaired deterministically.
 * - majority of sections invalid ⇒ full deterministic fallback.
 * Evidence is ALWAYS the deterministic map, regardless of the model.
 */
export function assembleInsight(
  raw: RawAi | null,
  ctx: InsightContext,
  baseMeta: Omit<AiInsightMeta, "aiGenerated" | "validationErrors" | "repairedSections" | "fallbackReason">,
  failureReason?: string,
): AiInsight {
  const ev = computeEvidence(ctx.checks);

  if (!raw) {
    const meta: AiInsightMeta = { ...baseMeta, aiGenerated: false, validationErrors: [], repairedSections: [], fallbackReason: failureReason ?? "no_ai_output" };
    return buildDeterministicInsight(ctx, meta);
  }

  // Draft the AI insight (evidence is deterministic; text is the model's).
  const draft: AiInsight = {
    industry: (raw.industry ?? "").trim() || "Ej fastställd",
    businessSummary: (raw.business_summary ?? "").trim() || `Automatisk genomgång av ${ctx.domain}.`,
    executiveSummary: { text: (raw.executive_summary ?? "").trim(), evidenceCheckIds: ev.executiveSummary },
    biggestProblem: { text: (raw.biggest_problem ?? "").trim(), evidenceCheckIds: ev.biggestProblem },
    businessImpact: { items: (raw.business_impact ?? []).filter(Boolean), evidenceCheckIds: ev.businessImpact },
    quickFix: { text: (raw.quick_fix ?? "").trim(), evidenceCheckIds: ev.quickFix },
    strengths: { items: (raw.strengths ?? []).filter(Boolean), evidenceCheckIds: ev.strengths },
    weaknesses: { items: (raw.weaknesses ?? []).filter(Boolean), evidenceCheckIds: ev.weaknesses },
    opportunity: { text: (raw.opportunity ?? "").trim(), evidenceCheckIds: ev.opportunity },
    meta: { ...baseMeta, aiGenerated: true, validationErrors: [], repairedSections: [] },
  };

  const { errors, repairSections } = validateAiProse(draft, ctx);

  // Majority invalid → full deterministic fallback (still complete).
  const SECTION_COUNT = 7;
  if (repairSections.length > Math.floor(SECTION_COUNT / 2)) {
    const meta: AiInsightMeta = { ...baseMeta, aiGenerated: false, validationErrors: errors, repairedSections: [], fallbackReason: "validation_majority_failed" };
    return buildDeterministicInsight(ctx, meta);
  }

  // Repair only the offending sections from measured findings.
  const det = buildDeterministicInsight(ctx, draft.meta);
  const repaired = new Set(repairSections);
  const out: AiInsight = {
    ...draft,
    executiveSummary: repaired.has("executiveSummary") ? det.executiveSummary : draft.executiveSummary,
    biggestProblem: repaired.has("biggestProblem") ? det.biggestProblem : draft.biggestProblem,
    businessImpact: repaired.has("businessImpact") ? det.businessImpact : draft.businessImpact,
    quickFix: repaired.has("quickFix") ? det.quickFix : draft.quickFix,
    strengths: repaired.has("strengths") ? det.strengths : draft.strengths,
    weaknesses: repaired.has("weaknesses") ? det.weaknesses : draft.weaknesses,
    opportunity: repaired.has("opportunity") ? det.opportunity : draft.opportunity,
    meta: { ...draft.meta, aiGenerated: true, validationErrors: errors, repairedSections: repairSections },
  };
  return out;
}

/** Flatten an insight to the legacy flat fields the existing UI already renders. */
export function toFlatSummary(insight: AiInsight) {
  return {
    summary: insight.executiveSummary.text,
    biggestProblem: insight.biggestProblem.text,
    weaknesses: insight.weaknesses.items,
    strengths: insight.strengths.items,
    opportunity: insight.opportunity.text,
    businessImpact: insight.businessImpact.items,
    quickFix: insight.quickFix.text,
    industry: insight.industry,
    businessSummary: insight.businessSummary,
  };
}
