import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Globe, Check } from "lucide-react";
import ScoreGauge from "./ScoreGauge";

/**
 * Progress phases (percentage band + expected duration in ms). The percentage
 * climbs through these on a calm schedule and eases toward each band's cap, so
 * it never slams into a boundary. It holds at 99% until the backend confirms
 * completion — the real result is never pre-empted by a fabricated 100%.
 *
 *   0–15   connection & initialisation
 *   15–35  screenshot & page retrieval
 *   35–55  content & structure analysis
 *   55–70  SEO analysis
 *   70–82  performance analysis
 *   82–92  mobile, accessibility & trust checks
 *   92–99  final processing & result preparation
 */
const PROGRESS_PHASES = [
  { cap: 15, dur: 1800 },
  { cap: 35, dur: 3000 },
  { cap: 55, dur: 3200 },
  { cap: 70, dur: 2600 },
  { cap: 82, dur: 2400 },
  { cap: 92, dur: 2200 },
  { cap: 99, dur: 3400 },
];

/** The instantaneous ceiling the displayed percentage is allowed to reach. */
const ceilingAt = (elapsed: number) => {
  let t0 = 0;
  let prev = 0;
  for (const ph of PROGRESS_PHASES) {
    if (elapsed < t0 + ph.dur) {
      const f = (elapsed - t0) / ph.dur;
      const eased = 1 - Math.pow(1 - f, 2); // ease-out — slows toward the cap
      return prev + (ph.cap - prev) * eased;
    }
    t0 += ph.dur;
    prev = ph.cap;
  }
  return 99; // overran the schedule — hold at 99 until completion
};

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
  /** Fires once the percentage has finished animating to 100% (after `complete`). */
  onComplete?: () => void;
  /** Flips true when the real analysis result has arrived — releases 99% → 100%. */
  complete?: boolean;
  screenshotUrl?: string | null;
  domain?: string;
}

const LoadingState = ({ screenshotUrl, domain, complete = false, onComplete }: LoadingStateProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [scanLineY, setScanLineY] = useState(0);

  // Live analysis percentage — starts at 0, climbs strictly one point at a
  // time, never moves backwards, and only reaches 100 once `complete` is set.
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);
  const startRef = useRef(0);
  const lastIncRef = useRef(0);
  const completeRef = useRef(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (complete) completeRef.current = true;
  }, [complete]);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      if (startRef.current === 0) {
        startRef.current = now;
        lastIncRef.current = now;
      }
      const elapsed = now - startRef.current;
      // Ceiling caps at 99 until the backend confirms; then it opens to 100.
      const ceiling = completeRef.current ? 100 : Math.min(99, Math.floor(ceilingAt(elapsed)));
      const cur = pctRef.current;
      if (cur < ceiling) {
        const gap = ceiling - cur;
        // Fast, even fill on completion; a gentle, slowing creep near a cap.
        const interval = completeRef.current ? 16 : Math.min(300, Math.max(34, 260 / (gap + 0.5)));
        if (now - lastIncRef.current >= interval) {
          lastIncRef.current = now;
          const next = cur + 1; // exactly one percentage point
          pctRef.current = next;
          setPct(next);
          if (next >= 100 && !doneRef.current) {
            doneRef.current = true;
            onCompleteRef.current?.();
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

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
                <div className="flex items-center gap-1.5 truncate rounded-md bg-background px-3 py-1 font-mono text-[12px] text-muted-foreground/80">
                  <Lock className="h-2.5 w-2.5 text-neon-blue" />
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
                      <Globe className="h-8 w-8 text-muted-foreground/80" />
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
                <span className="data-label text-[0.72rem] text-neon-cyan">Skannar</span>
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
          <ScoreGauge value={0} scanning progress={pct} size={208} label="ANALYSERAR" />

          <div className="w-full max-w-xs">
            <p className="data-label mb-4 text-[0.72rem] text-muted-foreground/80">Diagnostik</p>
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
                        active ? "text-foreground" : "text-muted-foreground/80"
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
