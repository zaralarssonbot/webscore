import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateDomain } from "@/lib/domain";

interface WebTestSectionProps {
  onAnalyze: (domain: string) => void;
}

const benefits = [
  "Vad som fungerar",
  "Vad som brister",
  "Vad som måste förbättras",
];

const WebTestSection = ({ onAnalyze }: WebTestSectionProps) => {
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
    <section id="webtest" className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="glass-card-hero p-10 sm:p-14 glow-border relative overflow-hidden text-center"
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.07) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 20%, hsla(260,90%,60%,0.04) 0%, transparent 50%)" }} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center border"
              style={{
                background: "hsla(175,90%,55%,0.1)",
                borderColor: "hsla(175,90%,55%,0.2)",
                boxShadow: "0 0 30px hsla(175,90%,55%,0.12)",
              }}
            >
              <Search className="w-7 h-7" style={{ color: "hsl(175 90% 60%)" }} />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold font-display mb-4 tracking-[-0.02em] leading-[1.2]">
              Se varför din hemsida{" "}
              <span className="gradient-text">tappar kunder</span>
            </h2>
            <p className="text-muted-foreground font-normal max-w-md mx-auto mb-6 leading-[1.7] text-[0.9375rem]">
              Vårt kostnadsfria webbtest analyserar din sida och visar:
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {benefits.map((b) => (
                <span key={b} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  {b}
                </span>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="max-w-lg mx-auto mb-4">
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
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-score-low">{error}</p>
              )}
            </form>

            <p className="text-xs text-muted-foreground/80 tracking-wide">
              Du får en tydlig bild på under 60 sekunder
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default WebTestSection;
