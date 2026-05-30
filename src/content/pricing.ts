/*
 * ─────────────────────────────────────────────────────────────────────────
 * PRISER — en sanning, delas av startsidans pris-sektion och /pricing.
 *
 * VIKTIGT: priserna här är de BEFINTLIGA, oförändrade. De speglar paketen i
 * RemediationFlow. Ändra inte siffror lättvindigt – och håll dem i så fall
 * synkade med RemediationFlow.
 *
 * ÄGAREN BÖR DUBBELKOLLA (OWNER-VERIFY):
 *   • Vad varje tier FAKTISKT inkluderar idag (feature-listorna nedan är de
 *     som redan användes – bekräfta att de stämmer efter breddningen).
 *   • LÖPANDE vs PROJEKT: abonnemangen nedan gäller hemsidor (+ drift/support
 *     som ingår i form av support-perioder). Intranät och webbappar/system är
 *     PROJEKT och prissätts per offert – inga siffror uppfinns här.
 *   • Var SEO & branding hör hemma prismässigt (ingår i tiers? separat?) –
 *     bekräfta innan något utlovas som fast pris.
 *   • Drift/underhåll som löpande avtal: bekräfta om det säljs separat och i så
 *     fall till vilket pris (anges INTE här förrän bekräftat).
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface PricingTier {
  tier: string;
  name: string;
  description: string;
  /** Monthly price string, exactly as shown today (e.g. "1 495"). */
  price: string;
  priceNote: string;
  popular?: boolean;
  includes?: string;
  features: string[];
  cta: string;
}

/** LÖPANDE — abonnemang. Befintliga priser, oförändrade. */
export const recurringTiers: PricingTier[] = [
  {
    tier: "STARTER",
    name: "Grundpaket",
    description: "Perfekt för dig som behöver komma igång med en professionell närvaro på nätet.",
    price: "995",
    priceNote: "eller 11 940 kr engångspris · exkl. moms",
    features: [
      "Upp till 4 sidor (t.ex. Start, Om oss, Tjänster, Kontakt)",
      "Mobilanpassad & responsiv design",
      "Anpassad design utifrån din profil",
      "Kontaktformulär",
      "Google Maps-integration",
      "Grundläggande SEO-optimering",
      "Leverans inom 2 veckor",
      "30 dagars support efter lansering",
    ],
    cta: "Kom igång",
  },
  {
    tier: "PRO",
    name: "Tillväxtpaket",
    description: "För dig som vill synas, växa och konvertera besökare till kunder.",
    price: "1 495",
    priceNote: "eller 17 940 kr engångspris · exkl. moms",
    popular: true,
    includes: "ALLT I GRUNDPAKETET, PLUS:",
    features: [
      "Upp till 8 sidor",
      "Onlinebokning eller beställningsformulär",
      "Avancerad SEO + Google Business-setup",
      "Snabbladdad bildoptimering",
      "Integration med sociala medier",
      "2 st innehållsuppdateringar ingår (1 år)",
      "Cookiebanner & GDPR-anpassning",
      "90 dagars support efter lansering",
    ],
    cta: "Välj Pro",
  },
  {
    tier: "PREMIUM",
    name: "Premiumpaket",
    description: "Helhetslösningen för dig som vill ha maximal effekt och frihet att växa.",
    price: "1 995",
    priceNote: "eller 23 940 kr engångspris · exkl. moms",
    includes: "ALLT I TILLVÄXTPAKETET, PLUS:",
    features: [
      "Obegränsat antal sidor",
      "Automatiserade e-postutskick (t.ex. bokningsbekräftelse, nyhetsbrev)",
      "CRM-integration (koppla ihop kunddata)",
      "6 st redaktionella redigeringar/år (text, bilder, priser)",
      "Prioriterad support – svar inom 24h",
      "Månadsrapport med besöksstatistik",
      "Lokal SEO-strategi inkluderad",
      "12 månaders support efter lansering",
    ],
    cta: "Välj Premium",
  },
];

export interface ProjectOffer {
  title: string;
  description: string;
  href: string;
  points: string[];
}

/**
 * PROJEKT — prissätts per offert efter behov. INGA påhittade siffror.
 * Detta är intranät och webbappar/system ur de sex erbjudandena.
 */
export const projectOffers: ProjectOffer[] = [
  {
    title: "Intranät & interna portaler",
    href: "/tjanster/intranat",
    description:
      "Interna portaler byggs efter er storlek, era rutiner och era behov – därför sätter vi priset tillsammans efter en kort genomgång.",
    points: ["Omfattning efter ert behov", "Fast offert innan vi börjar", "Inga överraskningar"],
  },
  {
    title: "Webbappar, system & skräddarsydd mjukvara",
    href: "/tjanster/webbappar",
    description:
      "Skräddarsydd mjukvara prissätts efter omfattning och funktion. Vi tar fram en offert när vi förstått vad du faktiskt behöver.",
    points: ["Pris efter omfattning", "Tydlig offert i förväg", "Byggt kring era processer"],
  },
];

/** One line that explains löpande vs projekt — reused on both surfaces. */
export const pricingExplainer =
  "Löpande abonnemang för hemsida, SEO och drift – eller en skräddarsydd offert för intranät och systemutveckling. Du betalar för det du behöver, inget annat.";
