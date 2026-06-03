import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Monitor, Network, Code2, TrendingUp, Palette, Award, LifeBuoy, Users, Shield, Search, BarChart3, Phone, Rocket, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

// The full offering, grouped by the arc: bygga → synas & övertyga → driva.
// Exactly the six real services — nothing invented.
const serviceGroups = [
  {
    label: "VI BYGGER",
    items: [
      { icon: Monitor, slug: "hemsidor", title: "Hemsidor", description: "Moderna, snabba hemsidor byggda för att besökare ska stanna – och välja dig." },
      { icon: Network, slug: "intranat", title: "Intranät & interna portaler", description: "Interna portaler som samlar information, rutiner och verktyg på ett ställe." },
      { icon: Code2, slug: "webbappar", title: "Webbappar & system", description: "Webbappar, system och skräddarsydd mjukvara byggd kring hur ni faktiskt jobbar." },
    ],
  },
  {
    label: "VI FÅR DET ATT SYNAS & ÖVERTYGA",
    items: [
      { icon: TrendingUp, slug: "seo", title: "SEO & synlighet", description: "Vi ser till att du syns där dina kunder söker – och konkurrerar ut andra." },
      { icon: Palette, slug: "branding", title: "Branding & design", description: "Ett tydligt, sammanhängande varumärke som känns självklart att välja." },
    ],
  },
  {
    label: "VI HÅLLER DET IGÅNG",
    items: [
      { icon: LifeBuoy, slug: "drift", title: "Drift, underhåll & support", description: "Vi håller lösningen uppdaterad, säker och igång – så du slipper tänka på det." },
    ],
  },
];

const results = [
  { icon: Users, text: "Fler leads" },
  { icon: Shield, text: "Högre förtroende" },
  { icon: TrendingUp, text: "Bättre konvertering" },
  { icon: Award, text: "Starkare varumärke" },
];

const steps = [
  { number: "01", icon: Search, title: "Testa din hemsida", description: "Se direkt vad som saknas." },
  { number: "02", icon: BarChart3, title: "Få en tydlig analys", description: "Vi visar vad som håller dig tillbaka." },
  { number: "03", icon: Phone, title: "Boka strategi-call", description: "Vi går igenom lösningen." },
  { number: "04", icon: Rocket, title: "Vi bygger & optimerar", description: "Du får en hemsida som presterar." },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const } }),
};

const IconBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-neon-cyan/20 bg-neon-cyan/[0.07] text-neon-cyan">
    {children}
  </div>
);

const ServicesSection = () => {
  return (
    <section id="services" className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-5xl mx-auto space-y-28">

        {/* TJÄNSTER — din kompletta digitala partner */}
        <div>
          <SectionHeading
            eyebrow="MER ÄN HEMSIDOR"
            title={<>Din kompletta <span className="gradient-text">digitala partner</span></>}
            subtitle="Vi bygger era digitala lösningar, får dem att synas och övertyga – och håller dem igång. Allt från ett och samma team."
            className="mb-14"
          />

          <div className="space-y-12">
            {serviceGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-4 mb-5">
                  <span className="data-label text-[0.55rem] text-neon-cyan/70 whitespace-nowrap">{group.label}</span>
                  <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, hsl(var(--neon-cyan) / 0.25), transparent)" }} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {group.items.map((service, i) => (
                    <motion.div
                      key={service.slug}
                      custom={i} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                    >
                      <Link to={`/tjanster/${service.slug}`} className="card-surface p-7 group flex flex-col h-full">
                        <IconBadge><service.icon className="w-5 h-5" /></IconBadge>
                        <h3 className="font-display font-semibold text-lg mt-5 mb-2.5 tracking-[-0.02em]">{service.title}</h3>
                        <p className="text-[0.875rem] text-muted-foreground/80 leading-[1.7]">{service.description}</p>
                        <span className="data-label text-[0.5rem] text-neon-cyan/70 mt-5 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                          Läs mer <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESULTAT */}
        <div>
          <SectionHeading
            eyebrow="RESULTAT"
            title={<>Det handlar inte om utseende<br className="hidden sm:block" /><span className="gradient-text"> – utan om resultat</span></>}
            subtitle="En snygg hemsida utan strategi säljer inte. Vi kombinerar design, struktur och psykologi."
            className="mb-10"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {results.map((item, i) => (
              <motion.div
                key={item.text}
                custom={i} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                className="card-surface p-6 text-center flex flex-col items-center"
              >
                <IconBadge><item.icon className="w-5 h-5" /></IconBadge>
                <span className="font-display font-semibold text-[0.875rem] tracking-[-0.01em] mt-3">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SÅ FUNKAR DET */}
        <div id="process-steps">
          <SectionHeading eyebrow="SÅ FUNKAR DET" title={<>Fyra steg till <span className="gradient-text">bättre resultat</span></>} className="mb-12" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            <div className="hidden lg:block absolute top-[2.1rem] left-[12%] right-[12%] h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan) / 0.2), transparent)" }} />
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                custom={i} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                className="card-surface p-6 text-center relative"
              >
                <div className="relative inline-flex">
                  <IconBadge><step.icon className="w-5 h-5" /></IconBadge>
                  <span className="absolute -top-2 -right-2 font-mono text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-md bg-card border border-border text-neon-cyan">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-[0.9375rem] mt-4 mb-1.5 tracking-[-0.01em]">{step.title}</h3>
                <p className="text-[0.8125rem] text-muted-foreground/80 leading-[1.6]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;
