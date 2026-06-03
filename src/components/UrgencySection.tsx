import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const UrgencySection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="glass-card-hero p-10 sm:p-14 rounded-2xl relative overflow-hidden glow-border-magenta"
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(25,90%,55%,0.06) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 80%, hsla(260,90%,60%,0.04) 0%, transparent 50%)" }} />

          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center border relative"
            style={{
              background: "hsla(25,90%,55%,0.1)",
              borderColor: "hsla(25,90%,55%,0.2)",
              boxShadow: "0 0 30px hsla(25,90%,55%,0.12)",
            }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: "hsl(25 90% 60%)" }} />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold font-display mb-4 relative tracking-[-0.02em] leading-[1.2]">
            De flesta företag <span className="gradient-text-warm">väntar för länge</span>
          </h2>
          <p className="text-muted-foreground font-normal max-w-md mx-auto mb-4 leading-[1.75] relative text-[0.9375rem]">
            Varje dag din hemsida inte presterar tappar du kunder till konkurrenter.
          </p>
          <p className="text-[0.8125rem] text-muted-foreground/80 italic relative leading-[1.7]">
            Skillnaden mellan en okej sida och en bra sida kan vara avgörande.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default UrgencySection;
