import type { ScanResult, AuditCheck, CategoryScores } from "./scan-service";

/**
 * Recommendation engine — the reasoning behind the Decision Card.
 *
 * It thinks like a senior digital consultant rather than a checklist:
 * every FAILED deterministic audit check is a candidate fix, and each is weighed
 * by expected business impact, implementation effort, how confident we are, and
 * how it ranks against the alternatives. It then commits to ONE lead
 * recommendation and deliberately holds the rest back — because telling a client
 * to fix everything at once is the opposite of advice.
 *
 * Inputs are the deterministic checks (available in the fast score phase), the
 * category scores (where the site is actually weak), and light business context.
 * Output is a small, opinionated plan. The UI maps `plan.lead` onto the existing
 * Decision Card; nothing here knows about React.
 *
 * Design rules encoded here:
 *  - Never recommend everything → exactly one `lead`; the rest become `held`.
 *  - Prefer fewer, stronger recommendations → ranked by leverage (impact ÷ effort).
 *  - Always explain tradeoffs → `priorityReason` names what we deliberately defer.
 *  - Personalised → we only ever recommend things actually failing on THIS site,
 *    weighted by this site's weakest categories and its lead-gen surface.
 */

export type Effort = "low" | "medium" | "high";
export type ImpactLevel = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "preliminary";
export type Category = keyof CategoryScores;

export interface Recommendation {
  id: string;
  category: Category;
  /** The single thing to do, phrased as an instruction. */
  decision: string;
  /** Why it matters. */
  why: string;
  /** The concrete observations behind it (measured, not asserted). */
  evidence: string[];
  /** Expected effect on the business, not just the site. */
  businessImpact: string;
  /** Expected business impact level. */
  impact: ImpactLevel;
  /** Estimated implementation effort. */
  effort: Effort;
  /** How sure we are — deterministic checks earn "high". */
  confidence: Confidence;
  /** Impact-to-effort ratio used for ranking. */
  leverage: number;
}

export interface HeldRecommendation {
  id: string;
  label: string;
  /** Why this one is intentionally NOT recommended yet. */
  reason: string;
}

export interface RecommendationPlan {
  /** The one recommendation to act on now. */
  lead: Recommendation;
  /** Deliberately deferred — what a good consultant would hold back, and why. */
  held: HeldRecommendation[];
  /** One line: why the lead beats the rest, incl. what we hold. */
  priorityReason: string;
  /** One line: what the confidence is grounded in. */
  confidenceReason: string;
}

/** Approximate effort only — four honest buckets, never a precise estimate. */
export type TimeBucket = "5 min" | "30 min" | "2 timmar" | "en halvdag";

export interface RoadmapItem {
  id: string;
  /** The concrete action — the same instruction the Decision Card would give. */
  action: string;
  /** Roughly how long it takes. */
  time: TimeBucket;
}

export interface RoadmapPhase {
  /** A calm focus label, e.g. "Börja här". Not a date or a deadline. */
  title: string;
  /** One line on what this phase is about. */
  intent: string;
  items: RoadmapItem[];
}

const IMPACT_WEIGHT: Record<ImpactLevel, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_DIVISOR: Record<Effort, number> = { low: 1, medium: 2, high: 3.5 };

/** Default effort when a check isn't in the playbook — by category character. */
const DEFAULT_EFFORT: Record<Category, Effort> = {
  seo: "low",
  conversion: "medium",
  trust: "medium",
  performance: "high",
  security: "low",
};

/** User-facing category names — the same labels shown on the score block. */
const CATEGORY_LABELS: Record<Category, string> = {
  seo: "Hittbarhet",
  conversion: "Konvertering",
  trust: "Förtroende",
  performance: "Hastighet",
  security: "Säkerhet",
};

/** Approximate time per fix. Default by effort, with a few honest overrides. */
const DEFAULT_TIME: Record<Effort, TimeBucket> = { low: "30 min", medium: "2 timmar", high: "en halvdag" };
const TIME_OVERRIDE: Record<string, TimeBucket> = {
  phone: "5 min",
  address: "5 min",
  viewport: "30 min", // adding the viewport tag is quick, even if mobile work can grow
  word_count: "en halvdag",
  testimonials: "en halvdag",
};
const TIME_MINUTES: Record<TimeBucket, number> = { "5 min": 5, "30 min": 30, "2 timmar": 120, "en halvdag": 240 };

/** Checks tied directly to capturing leads — the heart of this product's customer. */
const LEADGEN_CHECKS = new Set(["cta", "cta_count", "forms", "phone", "email", "pricing", "testimonials", "address"]);
/** Foundational checks that unblock everything else — fix the base first. */
const FOUNDATION_CHECKS = new Set(["title", "h1", "ssl", "https", "viewport", "word_count"]);

interface Play {
  effort: Effort;
  decision: string;
  why: string;
  businessImpact: string;
}

/**
 * Consultant-voiced copy for the checks most likely to become the lead. Anything
 * not listed falls back to copy derived from the check itself — those rarely win
 * the ranking, so the catalogue stays focused on what matters.
 */
const PLAYBOOK: Record<string, Play> = {
  title: {
    effort: "low",
    decision: "Ge sidan en titel som säger vad ni gör – den syns först i Google.",
    why: "Utan titel-tagg bestämmer Google själv hur ni visas i sökresultatet.",
    businessImpact: "Er träff i Google får en rubrik som säger vad ni gör.",
  },
  meta_desc: {
    effort: "low",
    decision: "Skriv en egen meta-beskrivning för sökresultatet.",
    why: "Saknas beskrivningen väljer Google själv texten under er rubrik.",
    businessImpact: "Ni styr vad som står under rubriken i sökresultatet.",
  },
  h1: {
    effort: "low",
    decision: "Sätt en tydlig huvudrubrik (H1) som förklarar erbjudandet på en rad.",
    why: "Utan huvudrubrik möts besökaren inte av vad ni erbjuder högst upp.",
    businessImpact: "Sidan säger på första raden vad ni gör.",
  },
  word_count: {
    effort: "medium",
    decision: "Bygg ut innehållet så sidan förklarar vad ni erbjuder.",
    why: "Med så lite text har sidan svårt att förklara vad ni gör.",
    businessImpact: "Sidan får innehåll nog att förklara erbjudandet.",
  },
  cta: {
    effort: "medium",
    decision: "Lägg till en tydlig uppmaning att höra av sig – högst upp och i varje sektion.",
    why: "En intresserad besökare ser inget tydligt nästa steg att ta.",
    businessImpact: "Sidan pekar besökaren mot nästa steg.",
  },
  forms: {
    effort: "medium",
    decision: "Lägg till ett enkelt kontaktformulär så folk kan höra av sig direkt.",
    why: "Utan formulär måste besökaren själv leta upp ett sätt att höra av sig.",
    businessImpact: "Besökaren kan höra av sig direkt, utan att ringa.",
  },
  phone: {
    effort: "low",
    decision: "Gör telefonnumret klickbart så mobilbesökare kan ringa med ett tryck.",
    why: "En kund som vill ringa på mobilen hittar ingen väg att göra det.",
    businessImpact: "Mobilbesökare kan ringa direkt från sidan.",
  },
  pricing: {
    effort: "medium",
    decision: "Visa prisbild eller prisexempel så besökaren vet vad de ger sig in på.",
    why: "Utan prisindikation vet besökaren inte vad de ger sig in på.",
    businessImpact: "Besökaren får en uppfattning om vad det kostar.",
  },
  ssl: {
    effort: "low",
    decision: "Aktivera HTTPS – sidan visar 'Ej säker' för varje besökare idag.",
    why: "Webbläsaren visar 'Ej säker' innan besökaren ens läst något.",
    businessImpact: "Besökaren möts inte längre av en säkerhetsvarning.",
  },
  https: {
    effort: "low",
    decision: "Aktivera HTTPS-kryptering så sidan inte längre flaggas som osäker.",
    why: "Trafiken skickas okrypterad och flaggas av webbläsaren.",
    businessImpact: "Besökaren möts inte längre av en säkerhetsvarning.",
  },
  testimonials: {
    effort: "medium",
    decision: "Lägg till omdömen eller kundröster på sidan.",
    why: "En ny besökare har inget som bekräftar att ni levererar.",
    businessImpact: "Besökaren ser att andra redan anlitat er.",
  },
  viewport: {
    effort: "medium",
    decision: "Lägg till en viewport-tagg så sidan anpassas till mobilskärmar.",
    why: "Utan viewport-tagg visas sidan fel på en mobilskärm.",
    businessImpact: "Sidan anpassas till mobilskärmen.",
  },
  load_time: {
    effort: "high",
    decision: "Snabba upp sidan så den laddar innan besökaren tappar tålamodet.",
    why: "Laddtiden drar över – besökaren kan hinna lämna innan sidan syns.",
    businessImpact: "Sidan hinner visas innan tålamodet tar slut.",
  },
  cookie_consent: {
    effort: "low",
    decision: "Lägg till cookie-samtycke så ni uppfyller GDPR.",
    why: "Sidan saknar cookie-samtycke, vilket är ett lagkrav.",
    businessImpact: "Sidan uppfyller GDPR-kravet på samtycke.",
  },
  og_tags: {
    effort: "low",
    decision: "Lägg till Open Graph-taggar för hur länkar visas vid delning.",
    why: "Delas en länk till sidan saknar den bild och rubrik.",
    businessImpact: "Delade länkar visar rätt bild och rubrik.",
  },
  structured_data: {
    effort: "medium",
    decision: "Lägg till strukturerad data (Schema) så Google förstår er bättre.",
    why: "Google kan inte läsa innehållet som strukturerad data.",
    businessImpact: "Google kan visa er träff med betyg, pris eller bilder.",
  },
  address: {
    effort: "low",
    decision: "Visa er fysiska adress på sidan.",
    why: "Sidan visar ingen fysisk adress.",
    businessImpact: "Besökaren ser att ni finns på en riktig plats.",
  },
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lcFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const observe = (c: AuditCheck) => (c.detail?.trim() || c.label);
const effortOf = (c: AuditCheck): Effort => PLAYBOOK[c.id]?.effort ?? DEFAULT_EFFORT[c.category];

/** Impact-to-effort leverage, weighted by where this site is weakest + its model. */
const leverageOf = (c: AuditCheck, categoryScore: number): number => {
  const impactWeight = IMPACT_WEIGHT[c.impact];
  const categoryMult = 1 + (100 - clamp(categoryScore, 0, 100)) / 100; // weaker category → more urgent
  let contextMult = 1;
  if (LEADGEN_CHECKS.has(c.id)) contextMult *= 1.25; // this product's clients live on inbound leads
  if (FOUNDATION_CHECKS.has(c.id)) contextMult *= 1.15; // fix the base before the polish
  return (impactWeight * categoryMult * contextMult) / EFFORT_DIVISOR[effortOf(c)];
};

const buildLead = (c: AuditCheck, result: ScanResult, leverage: number): Recommendation => {
  const play = PLAYBOOK[c.id];
  const supporting = (result.auditChecks ?? [])
    .filter((x) => !x.passed && x.category === c.category && x.id !== c.id)
    .sort((a, b) => IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact]);
  const evidence = [c, ...supporting].slice(0, 3).map(observe);

  return {
    id: c.id,
    category: c.category,
    decision: play?.decision ?? `Åtgärda ${lcFirst(c.label)}.`,
    why: play?.why ?? observe(c),
    evidence,
    businessImpact: play?.businessImpact ?? "Det påverkar hur många av besökarna som tar kontakt.",
    impact: c.impact,
    effort: effortOf(c),
    confidence: "high", // grounded in a deterministic measurement of the page
    leverage,
  };
};

const holdReason = (c: AuditCheck): string => {
  if (c.impact !== "high") return "Mindre brådskande – tas i ett senare steg.";
  if (effortOf(c) === "high") return "Större jobb – vänta tills grunden sitter.";
  return "Bra näst på tur, men en sak i taget.";
};

const narrate = (lead: Recommendation, held: HeldRecommendation[], result: ScanResult): Pick<RecommendationPlan, "priorityReason" | "confidenceReason"> => {
  // Why #1, in terms the user can verify: the impact level the scan assigned this
  // check, the score of the category it sits in (the same number on the score
  // block), and the alternative we hold. Every token maps to a scan result.
  const catScore = Math.round(result.categoryScores[lead.category] ?? 60);
  const impactWord = lead.impact === "high" ? "Hög påverkan" : lead.impact === "medium" ? "Tydlig påverkan" : "Mindre påverkan";
  const cat = CATEGORY_LABELS[lead.category];
  const base =
    lead.category === weakestCategory(result.categoryScores)
      ? `${impactWord} i ${cat} – din svagaste kategori (${catScore}/100).`
      : `${impactWord} i ${cat} (${catScore}/100).`;
  const priorityReason = held[0] ? `${base} ${held[0].label} kommer sedan.` : base;
  const n = lead.evidence.length;
  const confidenceReason =
    lead.confidence === "high"
      ? `Uppmätt direkt på din sida i ${n} ${n === 1 ? "kontroll" : "kontroller"}.`
      : "Sidan klarar de tekniska kontrollerna – det här bygger på helheten.";
  return { priorityReason, confidenceReason };
};

/** When the site has no failing checks, fall back to the AI's growth angle. */
const growthFallback = (result: ScanResult): RecommendationPlan | null => {
  const decision = (result.quickFix || result.opportunity || result.biggestProblem || "").trim();
  if (!decision) return null;
  const lead: Recommendation = {
    id: "growth",
    category: weakestCategory(result.categoryScores),
    decision,
    why: (result.biggestProblem || result.summary || "").trim(),
    evidence: (result.weaknesses ?? []).slice(0, 3),
    businessImpact: result.businessImpact?.[0]?.trim() || "Bygger vidare på det sidan redan gör bra.",
    impact: "medium",
    effort: "medium",
    confidence: "medium",
    leverage: 0,
  };
  return { lead, held: [], priorityReason: "Inga tekniska brister på sidan – det här är nästa steg för att växa.", confidenceReason: "Sidan klarar de tekniska kontrollerna – det här bygger på helheten." };
};

const weakestCategory = (scores: CategoryScores): Category => {
  const entries = Object.entries(scores) as [Category, number][];
  return entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min), entries[0])[0];
};

/**
 * Rank every failing check, commit to one lead, hold the rest back.
 * Returns null only when there's nothing to say at all.
 */
export const prioritize = (result: ScanResult): RecommendationPlan | null => {
  const failing = (result.auditChecks ?? []).filter((c) => !c.passed);
  if (failing.length === 0) return growthFallback(result);

  const ranked = failing
    .map((c) => ({ c, lev: leverageOf(c, result.categoryScores[c.category] ?? 60) }))
    .sort((a, b) => b.lev - a.lev || IMPACT_WEIGHT[b.c.impact] - IMPACT_WEIGHT[a.c.impact]);

  const lead = buildLead(ranked[0].c, result, ranked[0].lev);
  const held = ranked.slice(1, 4).map(({ c }) => ({ id: c.id, label: c.label, reason: holdReason(c) }));
  const { priorityReason, confidenceReason } = narrate(lead, held, result);

  return { lead, held, priorityReason, confidenceReason };
};

const timeOf = (c: AuditCheck): TimeBucket => TIME_OVERRIDE[c.id] ?? DEFAULT_TIME[effortOf(c)];
const actionOf = (c: AuditCheck): string => PLAYBOOK[c.id]?.decision ?? `Åtgärda ${lcFirst(c.label)}.`;

/** Calm focus labels — a sequence, never a date or a deadline. */
const PHASE_TEMPLATES = [
  { title: "Börja här", intent: "Det som ger mest, snabbast." },
  { title: "Bygg vidare", intent: "Nästa lager när de första sitter." },
  { title: "Längre fram", intent: "Tar lite mer – ta dem i lugn takt." },
];

const MAX_PHASES = 3;
const MAX_ITEMS_PER_PHASE = 3;
const MAX_MINUTES_PER_PHASE = 300; // so a phase never grows past roughly a half-day

/**
 * Turn the prioritised fixes into a short execution plan: the same leverage
 * ranking the Decision Card uses, walked top-to-bottom (quick wins first) and
 * packed into a few calm phases that are never overloaded. Returns [] when there
 * isn't enough to plan (the Decision Card already covers a single fix).
 */
export const planRoadmap = (result: ScanResult): RoadmapPhase[] => {
  const failing = (result.auditChecks ?? []).filter((c) => !c.passed);
  if (failing.length < 2) return [];

  const ranked = failing
    .map((c) => ({ c, lev: leverageOf(c, result.categoryScores[c.category] ?? 60) }))
    .sort((a, b) => b.lev - a.lev || IMPACT_WEIGHT[b.c.impact] - IMPACT_WEIGHT[a.c.impact]);

  const buckets: RoadmapItem[][] = [[]];
  let minutes = 0;
  for (const { c } of ranked) {
    const time = timeOf(c);
    const current = buckets[buckets.length - 1];
    const overloaded = current.length >= MAX_ITEMS_PER_PHASE || minutes + TIME_MINUTES[time] > MAX_MINUTES_PER_PHASE;
    if (current.length > 0 && overloaded) {
      if (buckets.length >= MAX_PHASES) break; // cap the plan; lowest-leverage rest is left out
      buckets.push([]);
      minutes = 0;
    }
    buckets[buckets.length - 1].push({ id: c.id, action: actionOf(c), time });
    minutes += TIME_MINUTES[time];
  }

  return buckets
    .filter((items) => items.length > 0)
    .map((items, i) => ({ ...PHASE_TEMPLATES[Math.min(i, PHASE_TEMPLATES.length - 1)], items }));
};
