import { motion } from "framer-motion";
import { Check } from "lucide-react";

const reasons = [
  "Vi visar problemen innan vi säljer lösningen",
  "Vi bygger för resultat – inte bara design",
  "Vi tänker affär, inte bara teknik",
  "Snabb leverans & modern känsla",
  "Allt på ett ställe: hemsida, SEO, branding",
];

const WhyUsSection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/whyus-bg.mp4"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-cyan) / 0.15) 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(ellipse at 30% 70%, hsl(var(--neon-purple) / 0.1) 0%, transparent 50%)" }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to bottom, hsl(var(--background)), transparent)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
        />
      </div>

      <div className="max-w-2xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4 block">Varför oss</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display mb-4 tracking-[-0.02em] leading-[1.2]">
            Därför väljer företag <span className="gradient-text">Webscore</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-xl p-5 flex items-center gap-4 group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden border border-white/10 bg-background/80"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(ellipse at left center, hsla(175,90%,55%,0.06) 0%, transparent 60%)" }}
              />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 relative" style={{ background: "hsla(175,90%,55%,0.1)", borderColor: "hsla(175,90%,55%,0.2)" }}>
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium font-display text-[0.9375rem] tracking-[-0.01em] relative">{reason}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
