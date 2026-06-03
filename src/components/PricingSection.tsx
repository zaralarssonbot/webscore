import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import SectionHeading from "@/components/SectionHeading";
import { recurringTiers, projectOffers, pricingExplainer } from "@/content/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const PricingSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTitle, setBookingTitle] = useState("Boka gratis genomgång");

  const openBooking = (title: string) => {
    setBookingTitle(title);
    setBookingOpen(true);
  };

  return (
    <>
      <section id="pricing" className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="TRANSPARENTA PRISER"
            title={<>Betala för det du <span className="gradient-text">behöver</span></>}
            subtitle={pricingExplainer}
            className="mb-14"
          />

          {/* LÖPANDE — abonnemang */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-6">
              <span className="data-label text-[0.55rem] text-neon-cyan/70 whitespace-nowrap">LÖPANDE · ABONNEMANG</span>
              <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, hsl(var(--neon-cyan) / 0.25), transparent)" }} />
            </div>
            <p className="text-sm text-muted-foreground/70 mb-8 max-w-2xl leading-[1.7]">
              Hemsida med löpande drift och support. Alla priser är per månad i 12 månader – ingen bindningstid efter det. Engångspris finns som alternativ.
            </p>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
            >
              {recurringTiers.map((pkg) => (
                <motion.div
                  key={pkg.tier}
                  variants={fadeUp}
                  className={`relative card-surface p-6 sm:p-8 flex flex-col ${
                    pkg.popular ? "card-focus md:-mt-3 md:mb-3 z-10" : ""
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 data-label text-[0.55rem] px-4 py-1 rounded-full text-white bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple shadow-md">
                      POPULÄRAST
                    </div>
                  )}

                  <span className="data-label text-[0.58rem] self-start px-3 py-1 rounded-full border border-border bg-secondary text-neon-cyan mb-4">
                    {pkg.tier}
                  </span>

                  <h3 className="font-display font-semibold text-xl mb-1.5 tracking-[-0.02em]">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground/80 mb-5 leading-[1.6]">{pkg.description}</p>

                  <div className="mb-1">
                    <span className="font-mono font-bold tabular-nums text-3xl sm:text-4xl text-foreground tracking-tight">{pkg.price} kr</span>
                    <span className="text-sm text-muted-foreground/60 font-mono">/mån</span>
                  </div>
                  <p className="text-xs text-muted-foreground/50 mb-6 font-mono">{pkg.priceNote}</p>

                  <div className="border-t border-border pt-5 mb-6 flex-1">
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
                    onClick={() => openBooking(`Boka ${pkg.name}`)}
                  >
                    {pkg.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* PROJEKT — offert efter behov */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="data-label text-[0.55rem] text-neon-cyan/70 whitespace-nowrap">PROJEKT · OFFERT EFTER BEHOV</span>
              <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, hsl(var(--neon-cyan) / 0.25), transparent)" }} />
            </div>
            <p className="text-sm text-muted-foreground/70 mb-8 max-w-2xl leading-[1.7]">
              Intranät och skräddarsydd mjukvara ser olika ut för varje företag. Därför sätter vi inget hyllpris – du får en tydlig offert efter en kostnadsfri genomgång.
            </p>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
            >
              {projectOffers.map((offer) => (
                <motion.div key={offer.title} variants={fadeUp} className="card-surface p-6 sm:p-8 flex flex-col">
                  <span className="data-label text-[0.58rem] self-start px-3 py-1 rounded-full border border-border bg-secondary text-neon-cyan mb-4">
                    OFFERT
                  </span>
                  <h3 className="font-display font-semibold text-xl mb-1.5 tracking-[-0.02em]">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground/80 mb-5 leading-[1.6]">{offer.description}</p>

                  <div className="mb-6">
                    <span className="font-mono font-bold text-2xl sm:text-3xl text-foreground tracking-tight">Offert efter behov</span>
                  </div>

                  <div className="border-t border-border pt-5 mb-6 flex-1">
                    <ul className="space-y-2.5">
                      {offer.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/80 leading-[1.5]">
                          <Check className="w-4 h-4 shrink-0 mt-0.5 text-neon-cyan" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="glow" size="lg" className="group glow-precision w-full sm:flex-1" onClick={() => openBooking(`Begär offert – ${offer.title}`)}>
                      <FileText className="w-4 h-4 mr-1.5" /> Begär offert
                    </Button>
                    <Button variant="glow-outline" size="lg" asChild className="w-full sm:flex-1">
                      <Link to={offer.href}>Läs mer</Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <LeadCaptureModal open={bookingOpen} onClose={() => setBookingOpen(false)} title={bookingTitle} />
    </>
  );
};

export default PricingSection;
