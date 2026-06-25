import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Compass, Code2, Rocket, TrendingUp } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import InfoModal, { type InfoModalData, clickableCardClass, CardMoreIndicator } from "@/components/InfoModal";

const steps = [
  {
    number: 1, icon: Search, title: "Gratis analys", day: "DAG 1",
    detail:
      "Vi börjar med en kostnadsfri analys av er nuvarande sajt och era mål. Den lägger grunden för allt vi gör – så att vi bygger utifrån vad ni faktiskt behöver, inte gissningar.",
  },
  {
    number: 2, icon: Compass, title: "Designförslag", day: "DAG 2–3",
    detail:
      "Ni får ett konkret designförslag som visar hur den nya sidan kan se ut och kännas. Vi stämmer av tidigt så att riktningen känns helt rätt innan vi börjar bygga.",
  },
  {
    number: 3, icon: Code2, title: "Produktion + SEO", day: "DAG 4–8",
    detail:
      "Vi bygger sidan snabb, responsiv och sökmotoroptimerad från grunden. SEO finns med från start – inte något som klistras på i efterhand.",
  },
  {
    number: 4, icon: Rocket, title: "Lansering", day: "DAG 9–10",
    detail:
      "Vi lanserar sidan, testar att allt fungerar och ser till att övergången blir smidig. Ni går live med en sajt som är redo att möta riktiga besökare.",
  },
  {
    number: 5, icon: TrendingUp, title: "Tillväxt", day: "DAG 11+",
    detail:
      "Efter lansering hjälper vi er att fortsätta växa – med uppföljning, förbättringar och löpande stöd. En hemsida är aldrig helt klar; den blir bättre över tid.",
  },
];

const ProcessSection = () => {
  const [active, setActive] = useState<InfoModalData | null>(null);
  const openStep = (step: typeof steps[number]) =>
    setActive({ eyebrow: step.day, title: step.title, description: step.detail, icon: step.icon });

  return (
    <section id="process" className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto relative">
        <SectionHeading
          eyebrow="VÅR PROCESS"
          title={<>Så jobbar vi – <span className="gradient-text">5 enkla steg</span></>}
          subtitle="Från analys till tillväxt. Hela processen tar 7–14 dagar."
          className="mb-16 sm:mb-20"
        />

        <div className="relative">
          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block">
            <div className="relative flex items-start justify-between mb-10 px-8">
              <div className="absolute left-[10%] right-[10%] top-12 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan) / 0.25), transparent)" }} />
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-full flex items-center justify-center relative bg-card border border-border shadow-[var(--card-shadow)]">
                    <div className="icon-chip w-14 h-14 rounded-full flex items-center justify-center">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[0.74rem] font-semibold bg-card border border-border text-neon-blue shadow-sm">
                      {step.number}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
              {steps.map((step, i) => (
                <motion.button
                  key={`card-${step.number}`}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 + 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => openStep(step)}
                  aria-label={`Läs mer: ${step.title}`}
                  className={`${clickableCardClass} card-surface p-5 text-center`}
                >
                  <CardMoreIndicator />
                  <span className="data-label text-[0.72rem] text-neon-blue block mb-1.5">{step.day}</span>
                  <h3 className="font-display font-semibold text-sm tracking-[-0.01em]">{step.title}</h3>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden space-y-4">
            {steps.map((step, i) => (
              <motion.button
                key={step.number}
                type="button"
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => openStep(step)}
                aria-label={`Läs mer: ${step.title}`}
                className={`${clickableCardClass} card-surface p-5 flex items-center gap-4`}
              >
                <CardMoreIndicator />
                <div className="icon-chip w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative">
                  <step.icon className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[0.72rem] font-semibold bg-card border border-border text-neon-blue shadow-sm">
                    {step.number}
                  </span>
                </div>
                <div>
                  <span className="data-label text-[0.72rem] text-neon-blue block mb-0.5">{step.day}</span>
                  <h3 className="font-display font-semibold text-sm">{step.title}</h3>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <InfoModal data={active} onClose={() => setActive(null)} />
    </section>
  );
};

export default ProcessSection;
