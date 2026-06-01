import { motion } from "framer-motion";

// Substantiated facts only — no fabricated traction/satisfaction numbers.
const stats = [
  { value: "41", label: "Kontroller per analys" },
  { value: "5", label: "Kategorier som granskas" },
  { value: "60s", label: "Genomsnittlig analystid" },
  { value: "0 kr", label: "Kostnadsfri analys" },
];

const SocialProofSection = () => {
  return (
    <section className="relative z-10 py-16 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card rounded-2xl p-8 sm:p-10 relative overflow-hidden">
          <div className="accent-line-top accent-line-cyan" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.03) 0%, transparent 60%)" }} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl sm:text-3xl font-bold font-display gradient-text mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-light">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
