import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { validateDomain } from "@/lib/domain";
import ScoreGauge from "@/components/ScoreGauge";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeroSectionProps {
  onAnalyze: (domain: string) => void;
  onBookMeeting: () => void;
  errorMessage?: string | null;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

const HeroSection = ({ onAnalyze, onBookMeeting, errorMessage }: HeroSectionProps) => {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const isMobile = useIsMobile();
  // Bigger on desktop so the score commands the hero; capped on phones so it
  // never overflows the viewport.
  const gaugeSize = isMobile ? 288 : 408;

  const displayError = error || errorMessage || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = validateDomain(domain);
    if (!result.valid) {
      setError(result.error || "Invalid domain");
      return;
    }
    onAnalyze(result.normalized!);
  };

  return (
    <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-6 py-24 overflow-hidden">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
        {/* LEFT — copy + analyzer */}
        <motion.div variants={container} initial="hidden" animate="show" className="text-center lg:text-left">
          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-display font-bold tracking-[-0.045em] leading-[0.95] text-[2.75rem] sm:text-6xl lg:text-7xl mb-5"
          >
            Din hemsida<br />har ett{" "}
            <span className="relative inline-block">
              <span className="gradient-text">betyg</span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan)), hsl(var(--neon-blue)), transparent)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 1 }}
              />
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p variants={item} className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-[1.7]">
            Skriv in din domän. På 30 sekunder ser du vad som håller sidan tillbaka — och var den kan vinna fler kunder.
          </motion.p>

          {/* Analyzer — single clean input + gradient CTA */}
          <motion.form variants={item} onSubmit={handleSubmit} className="max-w-xl mx-auto lg:mx-0">
            <div className="relative group">
              {/* Subtle brand ring — calm by default, brightens on focus */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-neon-cyan/40 via-neon-blue/35 to-neon-purple/40 opacity-0 group-focus-within:opacity-70 blur-[6px] transition-opacity duration-500" />
              <div className="relative flex items-center gap-1.5 rounded-2xl border border-border bg-card shadow-sm p-1.5 pl-4 group-focus-within:border-neon-blue/50 transition-colors duration-300">
                <Search className="w-5 h-5 text-neon-blue shrink-0" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  placeholder="dinsida.se"
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/80 px-2.5 py-3.5 text-[1.05rem] font-mono tracking-tight min-w-0"
                  maxLength={253}
                />
                <Button type="submit" variant="glow-gradient" size="lg" className="shrink-0 h-12 px-5 glow-precision">
                  <span className="relative z-10 flex items-center gap-2 font-medium">
                    Analysera nu
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </div>
            {displayError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-score-low font-mono">
                {displayError}
              </motion.p>
            )}
          </motion.form>

          {/* ONE discreet trust row + booking link */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center lg:items-start gap-2 sm:gap-4 mt-5">
            <span className="data-label text-[0.74rem] text-muted-foreground/80">GRATIS · 30 SEKUNDER · INGEN REGISTRERING</span>
            <button type="button" onClick={onBookMeeting} className="inline-flex items-center min-h-[44px] gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              eller boka videomöte
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-[180ms]" />
            </button>
          </motion.div>
        </motion.div>

        {/* RIGHT — iconic score gauge. The pop entrance is owned by ScoreGauge
            (spring scale + glow burst), so this wrapper only fades in to avoid
            fighting the spring. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center lg:justify-end"
        >
          <ScoreGauge value={87} size={gaugeSize} label="BETYG" caption="EXEMPELANALYS" delay={0.18} accent="brand" pop />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div className="absolute bottom-8" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
        <div className="w-5 h-8 rounded-full border border-muted-foreground/25 flex items-start justify-center pt-1.5">
          <motion.div className="w-0.5 h-1.5 rounded-full bg-neon-blue/60" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
