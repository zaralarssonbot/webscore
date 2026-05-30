import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, Shield, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { validateDomain } from "@/lib/domain";
import LazyVideo from "@/components/LazyVideo";
import webscoreLogo from "@/assets/webscore-logo.png";

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

const StatCounters = () => {
  const stat1 = useCountUp(100, 2000);
  const stat2 = useCountUp(93, 1800);
  const stat3 = useCountUp(995, 2200);

  return (
    <>
      <div ref={stat1.ref} className="text-center px-4 py-5 sm:py-6">
        <span className="block text-xl sm:text-2xl md:text-3xl font-bold font-display gradient-text tracking-[-0.03em] leading-none">
          {stat1.count}+
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground/60 mt-1.5 block">Hemsidor skapade</span>
      </div>
      <div ref={stat2.ref} className="text-center px-4 py-5 sm:py-6">
        <span className="block text-xl sm:text-2xl md:text-3xl font-bold font-display gradient-text tracking-[-0.03em] leading-none">
          {stat2.count}%
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground/60 mt-1.5 block">Nöjda kunder</span>
      </div>
      <div ref={stat3.ref} className="text-center px-4 py-5 sm:py-6">
        <span className="block text-xl sm:text-2xl md:text-3xl font-bold font-display gradient-text tracking-[-0.03em] leading-none">
          <span className="mr-1 text-sm sm:text-base align-top opacity-80">från</span>
          {stat3.count}:-
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground/60 mt-1.5 block">/mån i 12 månader</span>
      </div>
    </>
  );
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
    <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 text-center overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 -z-10">
        <LazyVideo
          src="/hero-bg.mp4"
          poster="/hero-bg-poster.webp"
          rootMargin="0px"
          className="absolute inset-0 w-full h-full object-cover opacity-50 will-change-auto"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/50" />
        {/* Glow overlays */}
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(var(--neon-cyan) / 0.15) 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 30% 70%, hsl(var(--neon-purple) / 0.12) 0%, transparent 50%)" }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(ellipse at 70% 30%, hsl(var(--neon-blue) / 0.1) 0%, transparent 50%)" }}
        />
        {/* Bottom fade into page */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.7) 100%)" }}
        />
      </div>
      {/* Glass card container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-background/80 overflow-hidden"
      >
        {/* Inner glow effects */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.06) 0%, transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 20%, hsla(260,90%,60%,0.04) 0%, transparent 50%)" }} />

        <div className="relative px-5 sm:px-12 pt-8 sm:pt-10 pb-0">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-1"
          >
            <img src={webscoreLogo} alt="Webscore" className="h-20 sm:h-36 md:h-44 w-auto mx-auto" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] mb-4 leading-[1.1] font-display"
          >
            Din hemsida har ett{" "}
            <span className="relative">
              <span className="gradient-text">betyg</span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan)), hsl(var(--neon-blue)), transparent)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-lg mx-auto mb-6 font-normal leading-[1.7]"
          >
            Vi hjälper företag att öka sin synlighet, bygga förtroende och få fler kunder genom hemsida, SEO och branding.
          </motion.p>

          {/* Primary CTA — URL analyzer, always visible */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            onSubmit={handleSubmit}
            className="w-full max-w-xl mx-auto mb-3"
          >
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-neon-cyan/20 via-neon-blue/15 to-neon-purple/15 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 blur-lg transition-opacity duration-700" />
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-neon-cyan/25 via-neon-blue/15 to-neon-purple/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center glass-card rounded-2xl p-2" style={{ borderColor: "transparent" }}>
                <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  placeholder="Ange din domän (t.ex. dinsida.se)"
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground px-4 py-3 text-base"
                  maxLength={253}
                />
                <Button type="submit" variant="glow" size="lg" className="shrink-0">
                  <span className="relative z-10 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Analysera nu
                  </span>
                </Button>
              </div>
            </div>
            {displayError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-sm text-score-low"
              >
                {displayError}
              </motion.p>
            )}
          </motion.form>

          {/* Microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-muted-foreground/50 text-xs tracking-wide mb-3"
          >
            Tar 60 sekunder · Helt kostnadsfritt · Inga förpliktelser
          </motion.p>

          {/* Soft secondary — booking link */}
          <motion.button
            type="button"
            onClick={onBookMeeting}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            Föredrar du att prata? Boka ett kostnadsfritt videomöte
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Stats divider */}
        <div className="relative h-px mx-5 sm:mx-12" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan) / 0.2), hsl(var(--neon-blue) / 0.15), transparent)" }} />

        {/* Stats inside card */}
        <div className="relative grid grid-cols-3 divide-x divide-white/[0.06]">
          <StatCounters />
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-5 h-8 rounded-full border border-muted-foreground/20 flex items-start justify-center pt-1.5">
          <motion.div
            className="w-0.5 h-1.5 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
