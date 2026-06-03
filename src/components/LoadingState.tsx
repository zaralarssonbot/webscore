import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Globe, Check } from "lucide-react";
import ScoreGauge from "./ScoreGauge";

/**
 * Diagnostic phases. These mirror what the analysis ACTUALLY does:
 *  - createScan + screenshot run first (parallel),
 *  - then the analyze-website function reads the page, scores SEO,
 *    measures load time, checks mobile/security/trust,
 *  - then competitors are looked up and the report is assembled.
 * They advance on a calm cadence and HOLD on the last step until the real
 * result arrives (the parent swaps the view) — no fake percentage, no claim
 * of completion before the data is back.
 */
const steps = [
  "Ansluter till sidan",
  "Fångar skärmdump",
  "Läser innehåll & struktur",
  "Analyserar SEO & synlighet",
  "Mäter laddningstid",
  "Kontrollerar mobilanpassning",
  "Granskar säkerhet & förtroende",
  "Jämför med företag i området",
  "Sammanställer din rapport",
];

interface LoadingStateProps {
  /** Kept for API compatibility; the parent controls completion via real data. */
  onComplete?: () => void;
  screenshotUrl?: string | null;
  domain?: string;
}

const LoadingState = ({ screenshotUrl, domain }: LoadingStateProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [scanLineY, setScanLineY] = useState(0);

  // Advance through phases on a calm cadence, then hold on the final step.
  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((prev) => (prev >= steps.length - 1 ? prev : prev + 1));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Scan-line sweep over the screenshot preview.
  useEffect(() => {
    const id = setInterval(() => setScanLineY((y) => (y >= 100 ? 0 : y + 0.6)), 28);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:gap-14">
        {/* Live screenshot preview — the real page being analysed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md flex-shrink-0 lg:max-w-lg"
        >
          <div className="card-surface overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              </div>
              <div className="mx-3 flex-1">
                <div className="flex items-center gap-1.5 truncate rounded-md bg-background px-3 py-1 font-mono text-[10px] text-muted-foreground/70">
                  <Lock className="h-2.5 w-2.5 text-neon-cyan/70" />
                  {domain ? `https://${domain}` : "https://…"}
                </div>
              </div>
            </div>

            {/* Viewport */}
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              <AnimatePresence mode="wait">
                {screenshotUrl ? (
                  <motion.img
                    key="shot"
                    src={screenshotUrl}
                    alt={`Skärmdump av ${domain ?? "sidan"}`}
                    className="h-full w-full object-cover object-top"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 0.78, scale: 1 }}
                    transition={{ duration: 1 }}
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    className="flex h-full w-full items-center justify-center"
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                    >
                      <Globe className="h-8 w-8 text-muted-foreground/20" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Teal scan-line */}
              <div
                className="pointer-events-none absolute left-0 right-0 h-[2px]"
                style={{
                  top: `${scanLineY}%`,
                  background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan)), transparent)",
                  boxShadow: "0 0 20px hsl(var(--neon-cyan) / 0.5), 0 0 60px hsl(var(--neon-cyan) / 0.2)",
                }}
              />

              {/* Faint scan grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(var(--neon-cyan) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-cyan) / 0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Corner brackets */}
              <div className="absolute left-3 top-3 h-5 w-5 rounded-tl border-l border-t border-neon-cyan/30" />
              <div className="absolute right-3 top-3 h-5 w-5 rounded-tr border-r border-t border-neon-cyan/30" />
              <div className="absolute bottom-3 left-3 h-5 w-5 rounded-bl border-b border-l border-neon-cyan/30" />
              <div className="absolute bottom-3 right-3 h-5 w-5 rounded-br border-b border-r border-neon-cyan/30" />

              {/* Scanning badge */}
              <motion.div
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-neon-cyan/25 bg-background/70 px-2.5 py-1 backdrop-blur-sm"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" style={{ boxShadow: "0 0 8px hsl(var(--neon-cyan))" }} />
                <span className="data-label text-[0.5rem] text-neon-cyan">Skannar</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scanning gauge + honest diagnostic steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col items-center gap-9 lg:items-start"
        >
          <ScoreGauge value={0} scanning size={208} label="ANALYSERAR" />

          <div className="w-full max-w-xs">
            <p className="data-label mb-4 text-[0.5rem] text-muted-foreground/50">Diagnostik</p>
            <ul className="space-y-2.5">
              {steps.map((step, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                if (i > stepIndex) return null;
                return (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
                      style={{
                        borderColor: done || active ? "hsl(var(--neon-cyan) / 0.5)" : "hsl(var(--border))",
                        background: done ? "hsl(var(--neon-cyan) / 0.12)" : "transparent",
                      }}
                    >
                      {done ? (
                        <Check className="h-2.5 w-2.5 text-neon-cyan" />
                      ) : (
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-neon-cyan"
                          style={{ boxShadow: "0 0 8px hsl(var(--neon-cyan))" }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}
                    </span>
                    <span
                      className={`font-mono text-xs transition-colors duration-300 ${
                        active ? "text-foreground" : "text-muted-foreground/55"
                      }`}
                    >
                      {step}
                      {active && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        >
                          …
                        </motion.span>
                      )}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LoadingState;
