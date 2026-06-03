import { motion } from "framer-motion";
import { Globe, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Globe,
    title: "Ange din domän",
    description: "Skriv in din hemsidas adress – inget konto eller installation krävs.",
    hue: 175,
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Automatisk analys genomförs",
    description: "41 automatiska kontroller av SEO, förtroende, konvertering, prestanda och säkerhet.",
    hue: 215,
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Få din rapport",
    description: "Du får ett tydligt betyg, konkreta svagheter och styrkor, och en plan för förbättring.",
    hue: 320,
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative z-10 py-24 sm:py-32 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4 block">Så fungerar det</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-4">
            Tre steg till en <span className="gradient-text">bättre hemsida</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto font-light leading-relaxed">
            Det tar under 60 sekunder att förstå var din hemsida kan förbättras.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan) / 0.2), hsl(var(--neon-blue) / 0.2), hsl(var(--neon-magenta) / 0.15), transparent)" }} />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass-card p-7 rounded-2xl relative overflow-hidden text-center group"
            >
              <div
                className="accent-line-top"
                style={{ background: `linear-gradient(90deg, transparent, hsla(${step.hue},90%,55%,0.4), transparent)` }}
              />

              {/* Step number */}
              <div
                className="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center border relative"
                style={{
                  background: `hsla(${step.hue},90%,55%,0.08)`,
                  borderColor: `hsla(${step.hue},90%,55%,0.2)`,
                }}
              >
                <step.icon className="w-5 h-5" style={{ color: `hsl(${step.hue} 90% 55%)` }} />
                <span
                  className="absolute -top-2 -right-2 text-[12px] font-bold font-display px-1.5 py-0.5 rounded-md border"
                  style={{
                    background: `hsla(${step.hue},90%,55%,0.12)`,
                    borderColor: `hsla(${step.hue},90%,55%,0.2)`,
                    color: `hsl(${step.hue} 90% 60%)`,
                  }}
                >
                  {step.number}
                </span>
              </div>

              <h3 className="font-semibold font-display text-base mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">{step.description}</p>

              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-secondary/50 items-center justify-center border border-border/20">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/80" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
