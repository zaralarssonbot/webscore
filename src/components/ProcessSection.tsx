import { motion } from "framer-motion";
import { Search, Compass, Code2, Rocket, TrendingUp } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

const steps = [
  { number: 1, icon: Search, title: "Gratis analys", day: "DAG 1" },
  { number: 2, icon: Compass, title: "Designförslag", day: "DAG 2–3" },
  { number: 3, icon: Code2, title: "Produktion + SEO", day: "DAG 4–8" },
  { number: 4, icon: Rocket, title: "Lansering", day: "DAG 9–10" },
  { number: 5, icon: TrendingUp, title: "Tillväxt", day: "DAG 11+" },
];

const ProcessSection = () => {
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
                <motion.div
                  key={`card-${step.number}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 + 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="card-surface p-5 text-center"
                >
                  <span className="data-label text-[0.72rem] text-neon-blue block mb-1.5">{step.day}</span>
                  <h3 className="font-display font-semibold text-sm tracking-[-0.01em]">{step.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="card-surface p-5 flex items-center gap-4"
              >
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
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
