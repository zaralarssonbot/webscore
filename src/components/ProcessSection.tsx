import { motion } from "framer-motion";
import { Search, Compass, Code2, Rocket, TrendingUp } from "lucide-react";
import LazyVideo from "@/components/LazyVideo";

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Gratis analys",
    day: "Dag 1",
    hue: 175,
  },
  {
    number: 2,
    icon: Compass,
    title: "Designförslag",
    day: "Dag 2–3",
    hue: 215,
  },
  {
    number: 3,
    icon: Code2,
    title: "Produktion + SEO",
    day: "Dag 4–8",
    hue: 280,
  },
  {
    number: 4,
    icon: Rocket,
    title: "Lansering",
    day: "Dag 9–10",
    hue: 145,
  },
  {
    number: 5,
    icon: TrendingUp,
    title: "Tillväxt",
    day: "Dag 11+",
    hue: 35,
  },
];

const ProcessSection = () => {
  return (
    <section id="process" className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 -z-10">
        <LazyVideo
          src="/videos/process-bg.mp4"
          poster="/videos/process-bg-poster.webp"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/75" />
        <div
          className="absolute top-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to bottom, hsl(var(--background)), transparent)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4 border border-primary/30 rounded-full px-4 py-1.5">
            Vår process
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold font-display tracking-[-0.02em] leading-[1.2] mb-3">
            Så jobbar vi – <span className="gradient-text">5 enkla steg</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Från analys till tillväxt. Hela processen tar 7–14 dagar.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block">
            {/* Icons row with connecting line */}
            <div className="relative flex items-center justify-between mb-10 px-8">
              {/* Connection line behind icons */}
              <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-px bg-border/40" />

              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="relative flex flex-col items-center"
                >
                  {/* Outer ring */}
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center relative"
                    style={{
                      background: `radial-gradient(circle, hsla(${step.hue},60%,50%,0.08) 0%, transparent 70%)`,
                      border: `1.5px solid hsla(${step.hue},60%,55%,0.2)`,
                      boxShadow: `0 0 30px hsla(${step.hue},70%,50%,0.08), inset 0 0 20px hsla(${step.hue},60%,50%,0.05)`,
                    }}
                  >
                    {/* Inner circle */}
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle, hsla(${step.hue},60%,50%,0.12) 0%, hsla(${step.hue},60%,50%,0.04) 100%)`,
                        border: `1px solid hsla(${step.hue},60%,55%,0.15)`,
                      }}
                    >
                      <step.icon className="w-7 h-7" style={{ color: `hsl(${step.hue} 70% 60%)` }} />
                    </div>
                  </div>

                  {/* Number badge */}
                  <span
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-display border"
                    style={{
                      background: `hsl(${step.hue} 70% 50%)`,
                      borderColor: `hsl(${step.hue} 70% 60%)`,
                      color: "#fff",
                      boxShadow: `0 0 12px hsla(${step.hue},70%,50%,0.4)`,
                    }}
                  >
                    {step.number}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Cards row */}
            <div className="grid grid-cols-5 gap-4">
              {steps.map((step, i) => (
                <motion.div
                  key={`card-${step.number}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                  className="glass-card rounded-xl p-5 text-center"
                >
                  <span
                    className="text-xs font-semibold tracking-wide block mb-1.5"
                    style={{ color: `hsl(${step.hue} 70% 60%)` }}
                  >
                    {step.day}
                  </span>
                  <h3 className="font-semibold font-display text-sm tracking-[-0.01em]">{step.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="glass-card rounded-xl p-5 flex items-center gap-4"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 relative"
                  style={{
                    background: `radial-gradient(circle, hsla(${step.hue},60%,50%,0.12) 0%, transparent 70%)`,
                    border: `1.5px solid hsla(${step.hue},60%,55%,0.25)`,
                  }}
                >
                  <step.icon className="w-6 h-6" style={{ color: `hsl(${step.hue} 70% 60%)` }} />
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
                    style={{
                      background: `hsl(${step.hue} 70% 50%)`,
                      borderColor: `hsl(${step.hue} 70% 60%)`,
                      color: "#fff",
                    }}
                  >
                    {step.number}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold block mb-0.5" style={{ color: `hsl(${step.hue} 70% 60%)` }}>
                    {step.day}
                  </span>
                  <h3 className="font-semibold font-display text-sm">{step.title}</h3>
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
