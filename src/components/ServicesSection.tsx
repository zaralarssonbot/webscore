import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Monitor, Network, Code2, TrendingUp, Palette, Award, LifeBuoy, Users, Shield, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import InfoModal, { type InfoModalData, clickableCardClass, CardMoreIndicator } from "@/components/InfoModal";

// The full offering, grouped by the arc: bygga → synas & övertyga → driva.
// Exactly the six real services — nothing invented.
const serviceGroups = [
  {
    label: "VI BYGGER",
    items: [
      { icon: Monitor, slug: "hemsidor", title: "Hemsidor", description: "Snygga, blixtsnabba sajter byggda för att besökaren stannar, litar på dig – och hör av sig." },
      { icon: Network, slug: "intranat", title: "Intranät & interna portaler", description: "Samla rutiner, dokument och verktyg på ett ställe – så hela teamet hittar rätt direkt." },
      { icon: Code2, slug: "webbappar", title: "Webbappar & system", description: "System och webbappar byggda kring exakt hur ni jobbar – inte tvärtom." },
    ],
  },
  {
    label: "VI FÅR DET ATT SYNAS & ÖVERTYGA",
    items: [
      { icon: TrendingUp, slug: "seo", title: "SEO & synlighet", description: "Syns högt när kunderna söker – och ta platsen konkurrenterna annars tar." },
      { icon: Palette, slug: "branding", title: "Branding & design", description: "Ett tydligt, enhetligt varumärke som känns genomtänkt och självklart att välja." },
    ],
  },
  {
    label: "VI HÅLLER DET IGÅNG",
    items: [
      { icon: LifeBuoy, slug: "drift", title: "Drift, underhåll & support", description: "Uppdaterad, säker och alltid igång – vi sköter driften så du slipper tänka på den." },
    ],
  },
];

const results: { icon: typeof Users; text: string; detail: string }[] = [
  {
    icon: Users,
    text: "Fler leads",
    detail:
      "En hemsida som är byggd för att leda besökaren framåt skapar fler kontakt- och offertförfrågningar. Vi strukturerar innehåll, erbjudanden och tydliga uppmaningar så att rätt besökare faktiskt hör av sig – istället för att lämna sidan utan att göra något.",
  },
  {
    icon: Shield,
    text: "Högre förtroende",
    detail:
      "De flesta bestämmer sig på sekunder om de litar på ett företag. Med genomtänkt design, tydligt språk och rätt signaler – referenser, case och ett professionellt intryck – känns ni som ett tryggt val redan innan första samtalet.",
  },
  {
    icon: TrendingUp,
    text: "Bättre konvertering",
    detail:
      "Konvertering handlar om att fler av dem som redan besöker sidan tar nästa steg. Vi tar bort friktion, gör erbjudandet tydligt och guidar besökaren mot handling – så att trafiken ni redan har jobbar hårdare för er.",
  },
  {
    icon: Award,
    text: "Starkare varumärke",
    detail:
      "Ett enhetligt och genomtänkt varumärke gör att ni sticker ut och känns mer etablerade. När färg, form, ton och budskap hänger ihop bygger varje kontaktpunkt samma intryck – och ni blir lättare att känna igen och välja.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const } }),
};

const IconBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="icon-chip w-12 h-12 rounded-2xl flex items-center justify-center">
    {children}
  </div>
);

const ServicesSection = () => {
  const [active, setActive] = useState<InfoModalData | null>(null);

  return (
    <section id="services" className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-6xl mx-auto space-y-20 sm:space-y-24">

        {/* TJÄNSTER — din kompletta digitala partner */}
        <div>
          <SectionHeading
            eyebrow="MER ÄN HEMSIDOR"
            title={<>Din kompletta <span className="gradient-text">digitala partner</span></>}
            subtitle="Vi bygger era digitala lösningar, får dem att synas och övertyga – och håller dem igång. Allt från ett och samma team."
            className="mb-14 sm:mb-16"
          />

          <div className="space-y-12">
            {serviceGroups.map((group, gi) => (
              <div key={group.label}>
                <div className="flex items-center gap-4 mb-5">
                  <span className="data-label text-[0.72rem] text-neon-blue whitespace-nowrap">{group.label}</span>
                  <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, hsl(var(--neon-cyan) / 0.25), transparent)" }} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {group.items.map((service, i) => {
                    // One dominant card per section: the flagship service (Hemsidor).
                    const focus = gi === 0 && i === 0;
                    return (
                    <motion.div
                      key={service.slug}
                      custom={i} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                    >
                      <Link to={`/tjanster/${service.slug}`} className={`card-surface p-7 group flex flex-col h-full ${focus ? "card-focus" : ""}`}>
                        <div className="flex items-center justify-between">
                          <IconBadge><service.icon className="w-6 h-6" /></IconBadge>
                          {focus && (
                            <span className="data-label text-[0.72rem] px-2.5 py-1 rounded-full text-white bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple">
                              HUVUDTJÄNST
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-xl mt-5 mb-2.5 tracking-[-0.02em]">{service.title}</h3>
                        <p className="text-[0.9rem] text-muted-foreground leading-[1.7] flex-1">{service.description}</p>
                        <span className="data-label text-[0.72rem] text-neon-blue mt-6 inline-flex items-center gap-1.5">
                          Läs mer <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      </Link>
                    </motion.div>
                    );
                  })}
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
            className="mb-14 sm:mb-16"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {results.map((item, i) => (
              <motion.button
                key={item.text}
                type="button"
                custom={i} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                onClick={() => setActive({ eyebrow: "RESULTAT", title: item.text, description: item.detail, icon: item.icon })}
                aria-label={`Läs mer: ${item.text}`}
                className={`${clickableCardClass} card-surface p-6 text-center flex flex-col items-center`}
              >
                <CardMoreIndicator />
                <IconBadge><item.icon className="w-6 h-6" /></IconBadge>
                <span className="font-display font-semibold text-[0.9375rem] tracking-[-0.01em] mt-3.5">{item.text}</span>
              </motion.button>
            ))}
          </div>
        </div>

      </div>

      <InfoModal data={active} onClose={() => setActive(null)} />
    </section>
  );
};

export default ServicesSection;
