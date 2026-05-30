import { motion } from "framer-motion";
import { Monitor, TrendingUp, Sparkles, Users, Shield, Search, BarChart3, Phone, Rocket, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Monitor,
    title: "Hemsidor som säljer",
    description: "Vi bygger moderna, snabba och säljande hemsidor som gör att kunder stannar – och väljer dig.",
    hue: 175,
  },
  {
    icon: TrendingUp,
    title: "SEO & synlighet",
    description: "Vi ser till att du syns där dina kunder söker – och konkurrerar ut andra.",
    hue: 215,
  },
  {
    icon: Sparkles,
    title: "Branding & förtroende",
    description: "Vi bygger varumärken som känns premium, tydliga och självklara att välja.",
    hue: 260,
  },
];

const results = [
  { icon: Users, text: "Fler leads", hue: 175 },
  { icon: Shield, text: "Högre förtroende", hue: 260 },
  { icon: TrendingUp, text: "Bättre konvertering", hue: 215 },
  { icon: Sparkles, text: "Starkare varumärke", hue: 25 },
];

const steps = [
  { number: "01", icon: Search, title: "Testa din hemsida", description: "Se direkt vad som saknas.", hue: 175 },
  { number: "02", icon: BarChart3, title: "Få en tydlig analys", description: "Vi visar vad som håller dig tillbaka.", hue: 215 },
  { number: "03", icon: Phone, title: "Boka strategi-call", description: "Vi går igenom lösningen.", hue: 260 },
  { number: "04", icon: Rocket, title: "Vi bygger & optimerar", description: "Du får en hemsida som presterar.", hue: 25 },
];

const ServicesSection = () => {
  return (
    <section id="services" className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-5xl mx-auto space-y-28">

        {/* TJÄNSTER */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">Våra tjänster</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display tracking-[-0.02em] leading-[1.15]">
              Det här <span className="gradient-text">gör vi</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-7 rounded-2xl relative overflow-hidden group hover:scale-[1.03] transition-all duration-300"
              >
                <div className="accent-line-top" style={{ background: `linear-gradient(90deg, transparent, hsla(${service.hue},90%,55%,0.5), transparent)` }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at top center, hsla(${service.hue},90%,55%,0.06) 0%, transparent 60%)` }} />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border mb-5 relative"
                  style={{
                    background: `hsla(${service.hue},90%,55%,0.1)`,
                    borderColor: `hsla(${service.hue},90%,55%,0.2)`,
                    boxShadow: `0 0 24px hsla(${service.hue},90%,55%,0.1)`,
                  }}
                >
                  <service.icon className="w-6 h-6" style={{ color: `hsl(${service.hue} 90% 60%)` }} />
                </div>
                <h3 className="font-semibold font-display text-lg mb-3 relative tracking-[-0.01em]">{service.title}</h3>
                <p className="text-[0.875rem] text-muted-foreground font-normal leading-[1.7] relative">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RESULTAT */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">Resultat</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display mb-4 leading-[1.15] tracking-[-0.02em]">
              Det handlar inte om utseende<br className="hidden sm:block" />
              <span className="gradient-text"> – utan om resultat</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-normal leading-[1.75] text-[0.9375rem]">
              En snygg hemsida utan strategi säljer inte. Vi kombinerar design, struktur och psykologi.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {results.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-card rounded-2xl p-6 text-center group hover:scale-[1.05] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, hsla(${item.hue},90%,55%,0.08) 0%, transparent 70%)` }} />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border mx-auto mb-3 relative"
                  style={{
                    background: `hsla(${item.hue},90%,55%,0.1)`,
                    borderColor: `hsla(${item.hue},90%,55%,0.2)`,
                    boxShadow: `0 0 20px hsla(${item.hue},90%,55%,0.1)`,
                  }}
                >
                  <item.icon className="w-5 h-5" style={{ color: `hsl(${item.hue} 90% 60%)` }} />
                </div>
                <span className="font-semibold font-display text-[0.875rem] tracking-[-0.01em] relative">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SÅ FUNKAR DET */}
        <div id="process">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">Så funkar det</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display tracking-[-0.02em] leading-[1.15]">
              Fyra steg till <span className="gradient-text">bättre resultat</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            <div className="hidden lg:block absolute top-14 left-[12%] right-[12%] h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan) / 0.25), hsl(var(--neon-blue) / 0.2), hsl(var(--neon-purple) / 0.15), transparent)" }} />
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-6 rounded-2xl relative overflow-hidden text-center group hover:scale-[1.03] transition-all duration-300"
              >
                <div className="accent-line-top" style={{ background: `linear-gradient(90deg, transparent, hsla(${step.hue},90%,55%,0.5), transparent)` }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at top, hsla(${step.hue},90%,55%,0.06) 0%, transparent 60%)` }} />
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center border relative"
                  style={{
                    background: `hsla(${step.hue},90%,55%,0.1)`,
                    borderColor: `hsla(${step.hue},90%,55%,0.25)`,
                    boxShadow: `0 0 20px hsla(${step.hue},90%,55%,0.08)`,
                  }}
                >
                  <step.icon className="w-5 h-5" style={{ color: `hsl(${step.hue} 90% 60%)` }} />
                  <span
                    className="absolute -top-2 -right-2 text-[10px] font-bold font-display px-1.5 py-0.5 rounded-md border"
                    style={{
                      background: `hsla(${step.hue},90%,55%,0.15)`,
                      borderColor: `hsla(${step.hue},90%,55%,0.25)`,
                      color: `hsl(${step.hue} 90% 65%)`,
                    }}
                  >
                    {step.number}
                  </span>
                </div>
                <h3 className="font-semibold font-display text-[0.9375rem] mb-1.5 tracking-[-0.01em] relative">{step.title}</h3>
                <p className="text-[0.8125rem] text-muted-foreground font-normal leading-[1.65] relative">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-secondary/60 items-center justify-center border border-border/30">
                    <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;
