import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateDomain } from "@/lib/domain";
import LazyVideo from "@/components/LazyVideo";

interface FinalCTASectionProps {
  onAnalyze: (domain: string) => void;
  onBookMeeting: () => void;
}

const benefits = [
  "Vad som fungerar",
  "Vad som brister",
  "Vad som måste förbättras",
];

const FinalCTASection = ({ onAnalyze, onBookMeeting }: FinalCTASectionProps) => {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = validateDomain(domain);
    if (!result.valid) {
      setError(result.error || "");
      return;
    }
    onAnalyze(result.normalized!);
  };

  return (
    <section id="webtest" className="relative z-10 py-28 sm:py-36 px-6 overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 -z-10">
        <LazyVideo
          src="/cta-bg.mp4"
          poster="/cta-bg-poster.webp"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse at 50% 50%, hsl(var(--neon-cyan) / 0.18) 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 30% 70%, hsl(var(--neon-purple) / 0.12) 0%, transparent 50%)" }}
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
      <div className="max-w-2xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="p-6 sm:p-14 relative overflow-hidden rounded-3xl border border-white/10 bg-background/80"
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.07) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 20%, hsla(260,90%,60%,0.04) 0%, transparent 50%)" }} />

          <div className="relative">
            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold font-display mb-4 tracking-[-0.02em] leading-[1.15]">
              Redo att ta din hemsida till{" "}
              <span className="gradient-text">nästa nivå?</span>
            </h2>
            <p className="text-muted-foreground font-normal max-w-md mx-auto mb-6 leading-[1.7] text-[0.9375rem]">
              Se exakt varför din hemsida tappar kunder — vårt kostnadsfria webbtest analyserar din sida och visar:
            </p>

            {/* Benefits */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {benefits.map((b) => (
                <span key={b} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  {b}
                </span>
              ))}
            </div>

            {/* Domain input */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto mb-6">
              <div className="relative flex items-center glass-card rounded-2xl p-2 group" style={{ borderColor: "transparent" }}>
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-neon-cyan/20 via-neon-blue/10 to-neon-purple/15 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0 relative" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  placeholder="Ange din domän (t.ex. dinsida.se)"
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground px-4 py-3 text-base relative"
                  maxLength={253}
                />
                <Button type="submit" variant="glow" size="lg" className="shrink-0 relative">
                  <span className="relative z-10 flex items-center gap-2">
                    Analysera
                    <Search className="w-4 h-4" />
                  </span>
                </Button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-score-low">{error}</p>
              )}
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-sm mx-auto mb-6">
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-xs text-muted-foreground/50 uppercase tracking-widest">eller</span>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            {/* Book meeting CTA */}
            <Button onClick={onBookMeeting} variant="outline" size="lg" className="text-base px-8 border-border/30 hover:border-primary/40 hover:bg-primary/5">
              <span className="flex items-center gap-2">
                Boka gratis analys
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>

            <p className="mt-6 text-xs text-muted-foreground/50 tracking-wide">
              Du får en tydlig bild på under 60 sekunder · Vi återkommer inom 24h
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
