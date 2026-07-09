import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { validateDomain } from "@/lib/domain";
import HeroObject from "@/components/HeroObject";

interface HeroSectionProps {
  onAnalyze: (domain: string) => void;
  onBookMeeting: () => void;
  errorMessage?: string | null;
}

/**
 * The landing hero. The Webscore hero object (the Calibration ring) is the
 * centerpiece: large, centered, with generous negative space above the copy.
 * The whole section fades up on load with a gentle stagger — all CSS, no JS
 * animation library, GPU-accelerated, and honoured-off under reduced-motion.
 */
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
    <section className="hero-section relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-6 py-20 sm:py-24 overflow-hidden">
      <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto">
        {/* CENTERPIECE — the Mark I hero object, scaled up with room to breathe.
            Uses a transform-only entrance so the LCP image is never opacity-gated. */}
        <div className="hero-rise-tf hero-media w-full max-w-[40rem] mb-8 sm:mb-11" style={{ animationDelay: "0.05s" }}>
          <HeroObject />
        </div>

        {/* Headline */}
        <h1
          className="hero-rise hero-headline font-display font-bold tracking-[-0.045em] leading-[0.98] text-[2.85rem] sm:text-6xl lg:text-[4.25rem] mb-5 sm:mb-6"
          style={{ animationDelay: "0.22s" }}
        >
          Din hemsida har ett{" "}
          <span className="relative inline-block">
            <span className="gradient-text">betyg</span>
            <span
              className="hero-underline absolute -bottom-1.5 left-0 right-0 h-[3px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan)), hsl(var(--neon-blue)), transparent)" }}
            />
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="hero-rise hero-sub text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto mb-8 sm:mb-9 leading-[1.6]"
          style={{ animationDelay: "0.36s" }}
        >
          Skriv in din domän. På 30 sekunder ser du vad som håller sidan tillbaka — och var den kan vinna fler kunder.
        </p>

        {/* Analyzer — single clean input + gradient CTA */}
        <form
          onSubmit={handleSubmit}
          className="hero-rise w-full max-w-xl mx-auto"
          style={{ animationDelay: "0.5s" }}
        >
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
            <p className="mt-3 text-sm text-score-low font-mono">{displayError}</p>
          )}
        </form>

        {/* ONE discreet trust row + booking link */}
        <div
          className="hero-rise flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-6"
          style={{ animationDelay: "0.64s" }}
        >
          <span className="data-label text-[0.74rem] text-muted-foreground/80">GRATIS · 30 SEKUNDER · INGEN REGISTRERING</span>
          <button type="button" onClick={onBookMeeting} className="inline-flex items-center min-h-[44px] gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            eller boka videomöte
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-[180ms]" />
          </button>
        </div>
      </div>

      {/* Scroll indicator — calm, CSS-only */}
      <div className="hero-rise absolute bottom-8" style={{ animationDelay: "1.1s" }}>
        <div className="hero-scroll-bob w-5 h-8 rounded-full border border-muted-foreground/25 flex items-start justify-center pt-1.5">
          <div className="w-0.5 h-1.5 rounded-full bg-neon-blue/60" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
