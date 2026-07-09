import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateDomain } from "@/lib/domain";

interface FinalCTASectionProps {
  onAnalyze: (domain: string) => void;
  onBookMeeting: () => void;
}

const benefits = ["Vad som fungerar", "Vad som brister", "Vad som måste förbättras"];

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
      <div className="max-w-2xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="card-surface p-8 sm:p-14 relative overflow-hidden"
        >
          {/* Faint brand wash inside the card — accent, not flood. */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--neon-blue) / 0.06) 0%, transparent 60%)" }} />

          <div className="relative">
            <span className="data-label text-[0.74rem] text-neon-blue mb-3.5 inline-block">KOSTNADSFRITT WEBBTEST</span>
            <h2 className="font-display font-semibold text-[1.75rem] sm:text-3xl md:text-[2.5rem] mb-4 tracking-[-0.035em] leading-[1.08]">
              Redo att ta din hemsida till{" "}
              <span className="gradient-text">nästa nivå?</span>
            </h2>
            <p className="text-muted-foreground/80 max-w-md mx-auto mb-6 leading-[1.65] text-base">
              Se vad analysen hittar på din sida — den visar:
            </p>

            {/* Benefits */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {benefits.map((b) => (
                <span key={b} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/80">
                  <CheckCircle className="w-4 h-4 text-neon-cyan shrink-0" />
                  {b}
                </span>
              ))}
            </div>

            {/* Domain input — matches the hero analyzer */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto mb-6">
              <div className="relative group">
                <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-neon-cyan/40 via-neon-blue/35 to-neon-purple/40 opacity-0 group-focus-within:opacity-70 blur-md transition-opacity duration-500" />
                <div className="relative flex items-center rounded-2xl border border-border bg-card shadow-sm p-2">
                  <Search className="w-5 h-5 text-neon-blue ml-3 shrink-0" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => { setDomain(e.target.value); setError(""); }}
                    placeholder="dinsida.se"
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/80 px-3 py-3 text-base font-mono tracking-tight min-w-0"
                    maxLength={253}
                  />
                  <Button type="submit" variant="glow-gradient" size="lg" className="shrink-0 glow-precision">
                    <span className="relative z-10 flex items-center gap-2 font-medium">
                      Analysera
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-score-low font-mono">{error}</p>}
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-sm mx-auto mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="data-label text-[0.72rem] text-muted-foreground/80">ELLER</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Book meeting — soft secondary */}
            <button type="button" onClick={onBookMeeting} className="inline-flex items-center min-h-[44px] gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              Boka gratis analys
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-[180ms]" />
            </button>

            <p className="mt-6 data-label text-[0.72rem] text-muted-foreground/80">
              UNDER 30 SEKUNDER · SVAR INOM 24H
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
