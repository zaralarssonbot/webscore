import { motion } from "framer-motion";
import { Users, Shield, TrendingUp, Award } from "lucide-react";

const results = [
  { icon: Users, text: "Fler leads", hue: 175 },
  { icon: Shield, text: "Högre förtroende", hue: 260 },
  { icon: TrendingUp, text: "Bättre konvertering", hue: 215 },
  { icon: Award, text: "Starkare varumärke", hue: 25 },
];

const InsightSection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4 block">Resultat</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display mb-5 leading-[1.2] tracking-[-0.02em]">
            Det handlar inte om hur din hemsida ser ut
            <br className="hidden sm:block" />
            <span className="gradient-text"> – utan vad den faktiskt gör</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto font-normal leading-[1.75] text-[0.9375rem]">
            En snygg hemsida utan strategi säljer inte. Vi kombinerar design, struktur och psykologi för att skapa resultat.
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
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at center, hsla(${item.hue},90%,55%,0.08) 0%, transparent 70%)` }}
              />
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
    </section>
  );
};

export default InsightSection;
