import { useState, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { validateDomain } from "@/lib/domain";
import LazyVideo from "@/components/LazyVideo";
import ScoreGauge from "@/components/ScoreGauge";

const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return { count, ref };
};

interface HeroSectionProps {
  onAnalyze: (domain: string) => void;
  onBookMeeting: () => void;
  errorMessage?: string | null;
}

// NOTE: these figures are placeholders flagged under ROADMAP item B (real proof).
const stats = [
  { value: 100, suffix: "+", label: "HEMSIDOR SKAPADE" },
  { value: 93, suffix: "%", label: "NÖJDA KUNDER" },
  { value: 995, prefix: "från ", suffix: ":-", label: "/MÅN I 12 MÅN" },
];

const StatStrip = () => {
  const c0 = useCountUp(stats[0].value, 2000);
  const c1 = useCountUp(stats[1].value, 1800);
  const c2 = useCountUp(stats[2].value, 2200);
  const counts = [c0, c1, c2];

  return (
    <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      {stats.map((s, i) => (
        <div key={s.label} ref={counts[i].ref} className="text-center px-3 py-4 sm:py-5 bg-background/40 backdrop-blur-sm">
          <span className="block font-mono font-semibold tabular-nums text-lg sm:text-2xl text-foreground tracking-tight">
            {s.prefix && <span className="text-xs sm:text-sm text-muted-foreground/60 align-top mr-0.5">{s.prefix}</span>}
            {counts[i].count}{s.suffix}
          </span>
          <span className="data-label text-[0.55rem] text-muted-foreground/45 mt-1.5 block">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

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
      {/* Background video — colour-graded into the neon palette */}
      <div className="absolute inset-0 -z-10">
        <LazyVideo
          src="/hero-bg.mp4"
          poster="/hero-bg-poster.webp"
          rootMargin="0px"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ filter: "saturate(1.25) contrast(1.25) brightness(0.42)" }}
        />
        {/* Neon tint grade */}
        <div className="absolute inset-0 mix-blend-color" style={{ background: "linear-gradient(135deg, hsla(190,90%,45%,0.5), hsla(258,80%,55%,0.4))" }} />
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 35%, hsl(var(--neon-cyan) / 0.12) 0%, transparent 55%)" }} />
        {/* Bottom fade into page */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 35%, hsl(var(--background) / 0.65) 100%)" }} />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
        {/* LEFT — copy + analyzer */}
        <motion.div variants={container} initial="hidden" animate="show" className="text-center lg:text-left">
          {/* Eyebrow */}
          <motion.div variants={item} className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-7">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" style={{ boxShadow: "0 0 10px hsl(var(--neon-cyan))" }} />
            </span>
            <span className="data-label text-[0.6rem] text-muted-foreground/80">AI-DRIVEN WEBBANALYS</span>
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
            Skriv in din domän. På 60 sekunder ser du exakt vad som håller sidan tillbaka — och var den kan vinna fler kunder.
          </motion.p>

          {/* Analyzer — glowing animated input */}
          <motion.form variants={item} onSubmit={handleSubmit} className="max-w-xl mx-auto lg:mx-0">
            <div className="relative group">
              {/* Continuous + focus glow */}
              <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-neon-cyan/40 via-neon-blue/30 to-neon-purple/40 opacity-50 group-focus-within:opacity-100 blur-md transition-opacity duration-500 animate-pulse-glow" />
              <div className="relative flex items-center rounded-2xl border border-white/10 bg-background/80 backdrop-blur-md p-2">
                <Search className="w-5 h-5 text-neon-cyan ml-3 shrink-0" style={{ filter: "drop-shadow(0 0 6px hsl(var(--neon-cyan)))" }} />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  placeholder="dinsida.se"
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 px-3 py-3 text-base font-mono tracking-tight min-w-0"
                  maxLength={253}
                />
                <Button type="submit" variant="glow" size="lg" className="shrink-0 glow-precision">
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
            <span className="data-label text-[0.58rem] text-muted-foreground/40">60 SEK · KOSTNADSFRITT · INGA FÖRPLIKTELSER</span>
            <button type="button" onClick={onBookMeeting} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              eller boka videomöte
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        </motion.div>

        {/* RIGHT — iconic score gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <ScoreGauge value={87} size={320} label="BETYG" caption="EXEMPELANALYS" delay={0.9} />
        </motion.div>
      </div>

      {/* Stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.1 }}
        className="w-full max-w-md mt-14"
      >
        <StatStrip />
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
