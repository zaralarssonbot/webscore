import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionHeading from "@/components/SectionHeading";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { recurringTiers, pricingExplainer } from "@/content/pricing";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/**
 * Compact pricing teaser for the homepage: the three recurring tiers + one
 * "skräddarsydd offert" card for projects. Full detail lives on /pricing.
 * Prices come from the shared source (src/content/pricing.ts) — never duplicated.
 */
const HomePricingSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <section id="pricing" className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="PRISER"
            title={<>Tydliga priser, <span className="gradient-text">inga överraskningar</span></>}
            subtitle={pricingExplainer}
            className="mb-14"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {/* Recurring tiers */}
            {recurringTiers.map((tier, i) => (
              <motion.div
                key={tier.tier}
                custom={i}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className={`card-surface p-6 flex flex-col ${tier.popular ? "card-focus sm:-mt-2 sm:mb-2 z-10" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="data-label text-[0.72rem] text-neon-blue">{tier.tier}</span>
                  {tier.popular && (
                    <span className="data-label text-[0.72rem] px-2.5 py-1 rounded-full text-white bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple">POPULÄRAST</span>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg mb-1 tracking-[-0.01em]">{tier.name}</h3>
                <div className="mb-1 mt-2">
                  <span className="font-mono font-bold tabular-nums text-2xl text-foreground tracking-tight">{tier.price} kr</span>
                  <span className="text-xs text-muted-foreground/80 font-mono">/mån</span>
                </div>
                <p className="text-[0.74rem] text-muted-foreground/80 font-mono mb-4 leading-[1.5]">{tier.priceNote}</p>
                <p className="text-[0.8125rem] text-muted-foreground/80 leading-[1.6] flex-1">{tier.description}</p>
              </motion.div>
            ))}

            {/* Project / custom quote */}
            <motion.div
              custom={recurringTiers.length}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              className="card-surface p-6 flex flex-col"
            >
              <span className="data-label text-[0.72rem] text-neon-blue mb-4">PROJEKT</span>
              <h3 className="font-display font-semibold text-base mb-1 tracking-[-0.01em]">Skräddarsydd offert</h3>
              <div className="mb-1 mt-2">
                <span className="font-mono font-bold text-xl text-foreground tracking-tight">Offert efter behov</span>
              </div>
              <p className="text-[0.74rem] text-muted-foreground/80 font-mono mb-4 leading-[1.5]">intranät · webbappar · system</p>
              <p className="text-[0.8125rem] text-muted-foreground/80 leading-[1.6] flex-1">
                Större projekt prissätts efter omfattning – du får en tydlig offert efter en genomgång.
              </p>
              <span className="data-label text-[0.72rem] text-neon-blue mt-4 inline-flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Begär offert
              </span>
            </motion.div>
          </div>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
            <Button variant="glow" size="lg" className="group glow-precision" asChild>
              <Link to="/pricing">
                Se alla priser & detaljer
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="glow-outline" size="lg" onClick={() => setBookingOpen(true)}>
              Boka 20 min genomgång
            </Button>
          </div>

          <p className="text-center data-label text-[0.72rem] text-muted-foreground/80 mt-6 flex items-center justify-center gap-2">
            <Check className="w-3 h-3 text-neon-blue" /> Ingen bindningstid efter 12 mån · exkl. moms
          </p>
        </div>
      </section>

      <LeadCaptureModal open={bookingOpen} onClose={() => setBookingOpen(false)} title="Boka gratis genomgång" />
    </>
  );
};

export default HomePricingSection;
