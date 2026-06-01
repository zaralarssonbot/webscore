import { motion } from "framer-motion";
import { Search, Shield, TrendingUp, Zap, BarChart3, Users } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "SEO & Synlighet",
    description: "Vi analyserar hur lätt det är att hitta din hemsida på Google och var du kan synas bättre.",
    hue: 175,
  },
  {
    icon: Shield,
    title: "Förtroende & Trovärdighet",
    description: "Hur professionell och trovärdig din hemsida uppfattas av besökare och potentiella kunder.",
    hue: 260,
  },
  {
    icon: TrendingUp,
    title: "Konvertering",
    description: "Hur effektivt din hemsida omvandlar besökare till faktiska kundkontakter och förfrågningar.",
    hue: 25,
  },
  {
    icon: Zap,
    title: "Prestanda & Hastighet",
    description: "Sidans laddningstid och tekniska prestanda som påverkar både SEO och användarupplevelse.",
    hue: 215,
  },
  {
    icon: BarChart3,
    title: "Konkurrentjämförelse",
    description: "Se hur du ligger till jämfört med andra företag i din bransch och ditt område.",
    hue: 320,
  },
  {
    icon: Users,
    title: "Affärspåverkan",
    description: "Förstå hur din hemsida påverkar din förmåga att få nya kunder och växa.",
    hue: 160,
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative z-10 py-24 sm:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4 block">Vad vi granskar</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-4">
            Allt din hemsida <span className="gradient-text">bedöms på</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
            Vi granskar de viktigaste faktorerna som avgör om din hemsida driver affär eller tappar kunder.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card p-6 sm:p-7 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            >
              <div
                className="accent-line-top"
                style={{ background: `linear-gradient(90deg, transparent, hsla(${feature.hue},90%,55%,0.4), transparent)` }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: `radial-gradient(ellipse at top, hsla(${feature.hue},90%,55%,0.04) 0%, transparent 60%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border mb-4"
                style={{
                  background: `hsla(${feature.hue},90%,55%,0.08)`,
                  borderColor: `hsla(${feature.hue},90%,55%,0.15)`,
                }}
              >
                <feature.icon className="w-5 h-5" style={{ color: `hsl(${feature.hue} 90% 55%)` }} />
              </div>

              <h3 className="font-semibold font-display text-base mb-2 relative">{feature.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed relative">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
