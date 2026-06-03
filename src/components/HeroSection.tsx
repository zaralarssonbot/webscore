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

// Honest offer stats — what we actually promise, no fabricated metrics.
const offers = [
  { value: "GRATIS", label: "INGEN REGISTRERING" },
  { value: "60 SEKUNDER", label: "TILL DITT BETYG" },
  { value: "FRÅN 995 KR/MÅN", label: "INGEN BINDNING" },
];

const OfferStrip = () => (
  <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
    {offers.map((o) => (
      <div key={o.label} className="text-center px-2.5 py-4 sm:py-5 bg-background/40 backdrop-blur-sm flex flex-col justify-center">
        <span className="block font-mono font-semibold text-[0.72rem] sm:text-[0.8rem] text-foreground tracking-tight leading-tight">
          {o.value}
        </span>
        <span className="data-label text-[0.5rem] text-muted-foreground/45 mt-1.5 block leading-[1.5]">{o.label}</span>
      </div>
    ))}
  </div>
);

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
      {/* Abstract backdrop — aurora mesh + living grid + glow (no video) */}
      <div className="absolute inset-0 -z-10">
        {/* Local aurora accents (on top of the global mesh) — contained, low */}
        <div
          className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full will-change-transform"
          style={{ background: "radial-gradient(circle, hsl(var(--neon-cyan) / 0.09) 0%, transparent 52%)", animation: "aurora-1 24s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[2%] right-[10%] w-[500px] h-[500px] rounded-full will-change-transform"
          style={{ background: "radial-gradient(circle, hsl(var(--neon-purple) / 0.08) 0%, transparent 52%)", animation: "aurora-3 28s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[40%] left-[6%] w-[420px] h-[420px] rounded-full will-change-transform"
          style={{ background: "radial-gradient(circle, hsl(var(--neon-blue) / 0.07) 0%, transparent 52%)", animation: "aurora-2 31s ease-in-out infinite" }}
        />
        {/* Living grid */}
        <div className="absolute inset-0 bg-grid-live opacity-40" />
        {/* Center focus glow */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 42%, hsl(var(--neon-cyan) / 0.08) 0%, transparent 52%)" }} />
        {/* Bottom fade into page */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 42%, hsl(var(--background) / 0.55) 100%)" }} />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
        {/* LEFT — copy + analyzer */}
        <motion.div variants={container} initial="hidden" animate="show" className="text-center lg:text-left">
          {/* Eyebrow */}
          <motion.div variants={item} className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-7">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" style={{ boxShadow: "0 0 10px hsl(var(--neon-cyan))" }} />
            </span>
            <span className="data-label text-[0.6rem] text-muted-foreground/80">GRATIS · 60 SEKUNDER</span>
          </motion.div>

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
            Skriv in din domän. På 60 sekunder ser du vad som håller sidan tillbaka — och var den kan vinna fler kunder.
          </motion.p>

          {/* Analyzer — glowing animated input */}
          <motion.form variants={item} onSubmit={handleSubmit} className="max-w-xl mx-auto lg:mx-0">
            <div className="relative group">
              {/* Subtle ring — calm by default, brightens on focus (no pulse soup) */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-neon-cyan/30 via-neon-blue/25 to-neon-purple/30 opacity-40 group-focus-within:opacity-90 blur-[6px] transition-opacity duration-500" />
              <div className="relative flex items-center gap-1.5 rounded-2xl border border-white/12 bg-background/70 backdrop-blur-md p-1.5 pl-4 group-focus-within:border-neon-cyan/40 transition-colors duration-300">
                <Search className="w-5 h-5 text-neon-cyan shrink-0" style={{ filter: "drop-shadow(0 0 6px hsl(var(--neon-cyan)))" }} />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  placeholder="dinsida.se"
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/45 px-2.5 py-3.5 text-[1.05rem] font-mono tracking-tight min-w-0"
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

          {/* Microcopy + booking */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center lg:items-start gap-2 sm:gap-4 mt-4">
            <span className="data-label text-[0.58rem] text-muted-foreground/40">60 SEKUNDER · KOSTNADSFRITT · INGA FÖRPLIKTELSER</span>
            <button type="button" onClick={onBookMeeting} className="inline-flex items-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              eller boka videomöte
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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

      {/* Stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.1 }}
        className="w-full max-w-lg mt-14"
      >
        <OfferStrip />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div className="absolute bottom-8" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
        <div className="w-5 h-8 rounded-full border border-muted-foreground/20 flex items-start justify-center pt-1.5">
          <motion.div className="w-0.5 h-1.5 rounded-full bg-neon-cyan/60" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
