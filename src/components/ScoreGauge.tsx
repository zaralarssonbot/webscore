import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/score-color";

interface ScoreGaugeProps {
  /** Target score 0–100 */
  value: number;
  /** Pixel diameter */
  size?: number;
  /** Small mono label above the number (e.g. "BETYG") */
  label?: string;
  /** Caption shown under the gauge */
  caption?: string;
  /** Delay (s) before the count-up + fill begins */
  delay?: number;
  /**
   * "score" (default) colours by value (green/yellow/red) — for the real result.
   * "brand" uses the teal→blue brand gradient regardless of value — for the hero example.
   */
  accent?: "score" | "brand";
  /**
   * Indeterminate "scanning" state — used during analysis, before a real score
   * exists. Shows a sweeping arc + pulsing readout instead of a value. Honest:
   * no number is fabricated until the real result arrives.
   */
  scanning?: boolean;
  /**
   * Punchy entrance — the gauge springs in with an overshoot scale/pop, the
   * count-up lands with weight, and a one-shot glow burst settles into the
   * normal breathing glow. Used for the hero example so the score grabs the
   * eye the instant the page opens. Off elsewhere (real result/scanning).
   */
  pop?: boolean;
  /**
   * Live analysis progress 0–100. When provided together with `scanning`, the
   * gauge becomes a determinate progress bar: the centre shows the percentage
   * (instead of the indeterminate dots) and the arc fills to it. The caller
   * owns the value so it only ever climbs and only hits 100 when the real
   * analysis is done.
   */
  progress?: number;
  className?: string;
}

// Semantic score tiers (green/cyan/yellow/orange/red) — see lib/score-color.
const colorFor = (v: number) => {
  const c = scoreColor(v);
  return { c: c.hsl, glow: c.glow };
};

const BRAND = { c: "hsl(190 90% 55%)", glow: "hsla(190,90%,52%,0.45)" };

/**
 * The hero score visualization: a glowing radial gauge with an animated fill,
 * count-up, a slow rotating scan-ring and a breathing glow. Reusable for the
 * real result score (value-coloured) and the hero example (brand-coloured).
 */
const ScoreGauge = ({ value, size = 280, label = "BETYG", caption, delay = 0.3, accent = "score", scanning = false, pop = false, progress, className }: ScoreGaugeProps) => {
  const [display, setDisplay] = useState(0);
  const [armed, setArmed] = useState(false);
  const raf = useRef<number>();
  // While scanning, force the teal→blue brand look (no value to colour by yet).
  const isBrand = accent === "brand" || scanning;
  const { c, glow } = scanning ? BRAND : isBrand ? BRAND : colorFor(value);
  const stroke = isBrand ? "url(#scoreGaugeBrand)" : c;

  const r = 42;
  const circ = 2 * Math.PI * r;
  const scoreOffset = armed ? circ - (display / 100) * circ : circ;
  // Determinate scanning: a live percentage drives the arc + centre readout.
  const determinateScan = scanning && typeof progress === "number";
  const scanVal = determinateScan ? Math.max(0, Math.min(100, Math.round(progress as number))) : 0;
  const scanOffset = circ - (scanVal / 100) * circ;
  // Whichever value is currently governing the arc (for the tick highlights).
  const arcVal = determinateScan ? scanVal : display;
  // A ~100° sweeping segment for the indeterminate scanning arc.
  const scanArc = circ * 0.28;

  useEffect(() => {
    if (scanning) return;
    const t = setTimeout(() => setArmed(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay, scanning]);

  useEffect(() => {
    if (!armed || scanning) return;
    // Pop lands snappier (shorter, sharper decel) so the number arrives with weight.
    const duration = pop ? 1300 : 1600;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = pop ? 1 - Math.pow(1 - p, 4) : 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [armed, value, scanning, pop]);

  return (
    <motion.div
      className={`relative flex flex-col items-center ${className ?? ""}`}
      style={{ width: size }}
      role={determinateScan ? "progressbar" : undefined}
      aria-label={determinateScan ? "Analysförlopp" : undefined}
      aria-valuemin={determinateScan ? 0 : undefined}
      aria-valuemax={determinateScan ? 100 : undefined}
      aria-valuenow={determinateScan ? scanVal : undefined}
      aria-valuetext={determinateScan ? `${scanVal}%` : undefined}
      initial={pop ? { scale: 0.55, opacity: 0 } : false}
      animate={pop ? { scale: 1, opacity: 1 } : undefined}
      transition={pop ? {
        scale: { type: "spring", stiffness: 230, damping: 12, delay },
        opacity: { duration: 0.35, delay },
      } : undefined}
    >
      {/* Breathing glow — larger/brighter when popping so the score really pops */}
      <div
        className="absolute rounded-full animate-gauge-pulse will-change-transform"
        style={{ width: size * (pop ? 1.18 : 1.02), height: size * (pop ? 1.18 : 1.02), top: pop ? "-6%" : "2%", background: `radial-gradient(circle, ${glow} 0%, transparent ${pop ? 64 : 60}%)` }}
      />

      {/* One-shot entrance glow burst — flashes out then settles into the breathing glow above */}
      {pop && (
        <motion.div
          className="absolute rounded-full will-change-transform"
          style={{ width: size * 1.35, height: size * 1.35, top: "-12%", background: `radial-gradient(circle, ${glow.replace("0.45", "0.6")} 0%, transparent 62%)` }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.18, 1.55] }}
          transition={{ duration: 1.5, delay, ease: "easeOut", times: [0, 0.32, 1] }}
        />
      )}

      {/* Rotating scan-ring */}
      <div
        className="absolute rounded-full animate-spin-slow"
        style={{
          width: size, height: size,
          background: `conic-gradient(from 0deg, transparent 0deg, ${glow} 40deg, transparent 120deg)`,
          maskImage: "radial-gradient(circle, transparent 62%, #000 63%, #000 71%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 62%, #000 63%, #000 71%, transparent 72%)",
          opacity: 0.55,
        }}
      />

      <svg width={size} height={size} viewBox="0 0 100 100" className="relative -rotate-90">
        <defs>
          <linearGradient id="scoreGaugeBrand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(175 90% 55%)" />
            <stop offset="100%" stopColor="hsl(215 92% 58%)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" opacity="0.5" />
        {/* Tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * 2 * Math.PI;
          const inner = 47, outer = i % 5 === 0 ? 49.5 : 48.5;
          return (
            <line
              key={i}
              x1={50 + inner * Math.cos(a)} y1={50 + inner * Math.sin(a)}
              x2={50 + outer * Math.cos(a)} y2={50 + outer * Math.sin(a)}
              stroke={c} strokeWidth={i % 5 === 0 ? 0.6 : 0.3}
              opacity={arcVal / 100 > i / 60 ? 0.7 : 0.12}
              style={{ transition: "opacity 0.4s" }}
            />
          );
        })}
        {/* Progress arc — determinate for a real value OR live scan %; sweeps
            only for the legacy indeterminate scanning state. */}
        {scanning && !determinateScan ? (
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={stroke} strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={`${scanArc} ${circ - scanArc}`}
            className="animate-[spin_2.2s_linear_infinite]"
            style={{ transformBox: "fill-box", transformOrigin: "center", filter: `drop-shadow(0 0 6px ${glow})` }}
          />
        ) : (
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={stroke} strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={determinateScan ? scanOffset : scoreOffset}
            style={{
              transition: determinateScan
                ? "stroke-dashoffset 0.2s linear"
                : "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)",
              filter: `drop-shadow(0 0 6px ${glow})`,
            }}
          />
        )}
      </svg>

      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: size * 0.02 }}>
        {label && <span className="data-label text-[0.74rem] text-muted-foreground/80 mb-1">{label}</span>}
        {scanning && determinateScan ? (
          // Live percentage — climbs one point at a time, synced to the arc.
          <span
            className="font-mono font-bold tabular-nums leading-none gradient-text"
            style={{
              fontSize: size * 0.3,
              filter: `drop-shadow(0 0 26px ${glow}) drop-shadow(0 0 60px ${glow.replace("0.45", "0.22")})`,
            }}
          >
            {scanVal}
            <span className="font-mono align-top" style={{ fontSize: size * 0.14 }}>%</span>
          </span>
        ) : scanning ? (
          // Indeterminate readout — no fabricated number until the result lands.
          <span className="flex items-center gap-1.5" style={{ height: size * 0.28 }} aria-label="Analyserar">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="rounded-full"
                style={{ width: size * 0.045, height: size * 0.045, background: c, boxShadow: `0 0 12px ${glow}` }}
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
              />
            ))}
          </span>
        ) : (
          <>
            <span
              className={`font-mono font-bold tabular-nums leading-none ${isBrand ? "gradient-text" : ""}`}
              style={{
                fontSize: size * 0.3,
                color: isBrand ? undefined : c,
                textShadow: isBrand ? undefined : `0 0 40px ${glow}, 0 0 80px ${glow.replace("0.45", "0.2")}`,
                filter: isBrand
                  ? (pop
                      ? `drop-shadow(0 0 38px ${glow.replace("0.45", "0.6")}) drop-shadow(0 0 90px ${glow.replace("0.45", "0.3")})`
                      : `drop-shadow(0 0 26px ${glow}) drop-shadow(0 0 60px ${glow.replace("0.45", "0.22")})`)
                  : undefined,
              }}
            >
              {display}
            </span>
            <span className="font-mono text-muted-foreground/80 text-sm mt-1">/ 100</span>
          </>
        )}
      </div>

      {caption && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 1.4, duration: 0.6 }}
          className="absolute -bottom-7 data-label text-[0.74rem] text-muted-foreground/80 whitespace-nowrap"
        >
          {caption}
        </motion.p>
      )}
    </motion.div>
  );
};

export default ScoreGauge;
