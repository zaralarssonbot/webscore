// M6 — SaaS subscription plans (analysis product). SEPARATE from the frozen
// agency /pricing (website-building packages). Prices SEK, exkl. moms.

export type PlanId = "free" | "pro" | "business" | "enterprise";

export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number | null;   // SEK/mo, null = custom
  annual: number | null;    // SEK/yr
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, business: 2, enterprise: 3 };

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Kom igång och testa",
    monthly: 0,
    annual: 0,
    features: [
      "3 domäner",
      "5 analyser / månad",
      "1 PDF-rapport / månad",
      "30 dagars historik",
      "Grundläggande AI-sammanfattning",
      "Community-support",
    ],
    cta: "Nuvarande plan",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "För dig som äger flera sajter",
    monthly: 249,
    annual: 2490,
    highlighted: true,
    features: [
      "10 domäner",
      "100 analyser / månad",
      "50 PDF-rapporter / månad",
      "12 månaders historik",
      "Full AI-analys med evidens",
      "Veckovis övervakning + poänglarm",
      "Konkurrentspårning (3/domän)",
      "E-postsupport",
    ],
    cta: "Uppgradera till Pro",
  },
  {
    id: "business",
    name: "Business",
    tagline: "För byråer och team",
    monthly: 799,
    annual: 7990,
    features: [
      "50 domäner",
      "1 000 analyser / månad",
      "Obegränsat med PDF:er",
      "Obegränsad historik",
      "Full AI-analys",
      "Daglig övervakning",
      "Konkurrentspårning (10/domän)",
      "Prioriterad support",
    ],
    cta: "Uppgradera till Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Skräddarsytt för större behov",
    monthly: null,
    annual: null,
    features: [
      "Obegränsade domäner & analyser",
      "Anpassade kvoter",
      "Dedikerad support & SLA",
      "Fakturabetalning",
      "API & SSO (kommande)",
    ],
    cta: "Kontakta oss",
  },
];

export function planById(id: PlanId): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
