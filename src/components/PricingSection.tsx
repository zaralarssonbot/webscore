import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import SectionHeading from "@/components/SectionHeading";

const packages = [
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

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
          <SectionHeading
            eyebrow="TRANSPARENTA PRISER"
            title="Välj det paket som passar dig"
            subtitle="Alla priser är per månad i 12 månader. Ingen bindningstid efter det."
            className="mb-14"
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
          >
            {packages.map((pkg) => (
              <motion.div
                key={pkg.tier}
                variants={fadeUp}
                className={`relative card-surface p-6 sm:p-8 flex flex-col ${
                  pkg.popular ? "border-neon-cyan/25 ring-1 ring-neon-cyan/20 shadow-glow-soft md:-translate-y-2" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 data-label text-[0.55rem] px-4 py-1 rounded-full bg-neon-cyan text-background">
                    POPULÄRAST
                  </div>
                )}

                <span className="data-label text-[0.58rem] self-start px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-neon-cyan/80 mb-4">
                  {pkg.tier}
                </span>

                <h3 className="font-display font-semibold text-xl mb-1.5 tracking-[-0.02em]">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground/80 mb-5 leading-[1.6]">{pkg.description}</p>

                <div className="mb-1">
                  <span className="font-mono font-bold tabular-nums text-3xl sm:text-4xl text-foreground tracking-tight">{pkg.price} kr</span>
                  <span className="text-sm text-muted-foreground/60 font-mono">/mån</span>
                </div>
                <p className="text-xs text-muted-foreground/50 mb-6 font-mono">{pkg.priceNote}</p>

                <div className="border-t border-white/[0.06] pt-5 mb-6 flex-1">
                  <p className="data-label text-[0.5rem] text-muted-foreground/50 mb-3">{pkg.includes ?? "INGÅR I PAKETET"}</p>
                  <ul className="space-y-2.5">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/80 leading-[1.5]">
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-neon-cyan" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant={pkg.popular ? "glow" : "glow-outline"}
                  size="lg"
                  className={`w-full group ${pkg.popular ? "glow-precision" : ""}`}
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
