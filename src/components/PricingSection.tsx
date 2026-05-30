import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadCaptureModal from "@/components/LeadCaptureModal";

const packages = [
  {
    tier: "STARTER",
    name: "Grundpaket",
    description: "Perfekt för dig som behöver komma igång med en professionell närvaro på nätet.",
    price: "995",
    priceNote: "eller 11 940 kr engångspris · exkl. moms",
    color: "hsl(var(--neon-cyan))",
    colorBg: "hsla(175,95%,50%,0.06)",
    colorBorder: "hsla(175,95%,50%,0.15)",
    colorGlow: "hsla(175,95%,50%,0.2)",
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
    color: "hsl(var(--neon-blue))",
    colorBg: "hsla(215,100%,60%,0.06)",
    colorBorder: "hsla(215,100%,60%,0.15)",
    colorGlow: "hsla(215,100%,60%,0.25)",
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
    color: "hsl(var(--neon-orange))",
    colorBg: "hsla(25,100%,58%,0.06)",
    colorBorder: "hsla(25,100%,58%,0.15)",
    colorGlow: "hsla(25,100%,58%,0.25)",
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const PricingSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");

  const handleSelectPackage = (tier: string) => {
    setSelectedTier(tier);
    setBookingOpen(true);
  };

  return (
    <>
      <section id="pricing" className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 text-xs text-neon-cyan font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Transparenta priser
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold font-display mb-3">
              Välj det paket som passar dig
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground font-light max-w-xl mx-auto">
              Alla priser är per månad i 12 månader. Ingen bindningstid efter det.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {packages.map((pkg) => (
              <motion.div
                key={pkg.tier}
                variants={fadeUp}
                className={`relative glass-card p-6 sm:p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                  pkg.popular
                    ? "ring-1 ring-neon-blue/30 border-neon-blue/20"
                    : "border-border/30"
                }`}
                style={{
                  boxShadow: pkg.popular ? `0 0 40px ${pkg.colorGlow}` : undefined,
                }}
              >
                {pkg.popular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{ background: pkg.color, color: "hsl(var(--background))" }}
                  >
                    Populärast
                  </div>
                )}

                <div
                  className="inline-flex self-start px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
                  style={{ background: pkg.colorBg, color: pkg.color, border: `1px solid ${pkg.colorBorder}` }}
                >
                  {pkg.tier}
                </div>

                <h3 className="text-xl font-bold font-display mb-1.5">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground font-light mb-5">{pkg.description}</p>

                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-bold font-display" style={{ color: pkg.color }}>
                    {pkg.price} kr
                  </span>
                  <span className="text-sm text-muted-foreground font-light">/mån</span>
                </div>
                <p className="text-xs text-muted-foreground/60 font-light mb-6">{pkg.priceNote}</p>

                <div className="border-t border-border/20 pt-5 mb-6 flex-1">
                  {pkg.includes && (
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-3">
                      {pkg.includes}
                    </p>
                  )}
                  {!pkg.includes && (
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-3">
                      INGÅR I PAKETET
                    </p>
                  )}
                  <ul className="space-y-2.5">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground font-light">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: pkg.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant={pkg.popular ? "glow-magenta" : "glow-outline"}
                  size="lg"
                  className="w-full group"
                  onClick={() => handleSelectPackage(pkg.tier)}
                >
                  {pkg.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <LeadCaptureModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title={`Boka ${selectedTier === "STARTER" ? "Grundpaket" : selectedTier === "PRO" ? "Tillväxtpaket" : "Premiumpaket"}`}
      />
    </>
  );
};

export default PricingSection;
