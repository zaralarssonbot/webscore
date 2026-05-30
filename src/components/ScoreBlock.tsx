import { motion } from "framer-motion";
import { categoryConfig } from "./CategoryScoreCard";
import { BarChart3 } from "lucide-react";
import ScoreGauge from "./ScoreGauge";

interface ScoreBlockProps {
  score: number;
  screenshotUrl?: string;
  domain?: string;
  categoryScores?: { seo: number; conversion: number; trust: number; performance: number; security: number };
  summary?: string;
}

const ScoreBlock = ({ score, screenshotUrl, domain, categoryScores, summary }: ScoreBlockProps) => {
  const getScoreColor = () => {
    if (score >= 80) return { color: "hsl(var(--score-high))", glow: "hsla(160,85%,50%,0.3)", hue: 160 };
    if (score >= 65) return { color: "hsl(var(--score-mid))", glow: "hsla(40,95%,55%,0.3)", hue: 40 };
    return { color: "hsl(var(--score-low))", glow: "hsla(0,80%,58%,0.3)", hue: 0 };
  };

  const getLabel = () => {
    if (score >= 80) return "Din hemsida presterar bra – men det finns fortfarande utrymme att växa";
    if (score >= 65) return "Din hemsida presterar under konkurrenterna";
    return "Din hemsida tappar besökare innan de tar kontakt";
  };

  const { color, glow, hue } = getScoreColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card-hero p-8 sm:p-10 relative overflow-hidden"
    >
      {/* Multi-layered glow */}
      <div className="absolute inset-0 rounded-3xl" style={{ background: `radial-gradient(ellipse at 50% 30%, ${glow.replace("0.3", "0.1")} 0%, transparent 50%)` }} />
      <div className="absolute inset-0 rounded-3xl" style={{ background: "radial-gradient(circle at 50% 80%, hsla(215,100%,60%,0.03) 0%, transparent 50%)" }} />
      <div className="absolute inset-0 rounded-3xl" style={{ background: "radial-gradient(circle at 80% 20%, hsla(320,90%,60%,0.03) 0%, transparent 40%)" }} />
      <div className="absolute inset-0 rounded-3xl opacity-25" style={{ boxShadow: `inset 0 0 100px ${glow}` }} />
      <div className="accent-line-top accent-line-cyan" />

      <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Score gauge */}
        <div className="flex flex-col items-center flex-shrink-0">
          <p className="data-label text-[0.6rem] text-muted-foreground/70 mb-5">
            Helhetsbedömning
          </p>

          <ScoreGauge value={score} size={216} label="BETYG" delay={0.2} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/20"
            style={{ background: `hsla(${hue},80%,50%,0.06)` }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 10px ${glow}` }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm text-muted-foreground font-light">{getLabel()}</span>
          </motion.div>

          {score < 80 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-3 text-xs text-muted-foreground/60 font-light text-center max-w-[220px] leading-relaxed"
            >
              Du ligger efter företag i ditt område – och det kan kosta dig kunder varje dag
            </motion.p>
          )}
        </div>

        {/* Screenshot */}
        {screenshotUrl && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full max-w-md"
          >
            <div className="rounded-xl overflow-hidden border border-border/20 shadow-2xl relative group">
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border/15">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-score-low/50" />
                  <div className="w-2 h-2 rounded-full bg-score-mid/50" />
                  <div className="w-2 h-2 rounded-full bg-score-high/50" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-secondary/50 rounded px-2 py-0.5 text-[9px] text-muted-foreground/50 font-mono truncate">
                    {domain || "..."}
                  </div>
                </div>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={screenshotUrl}
                  alt={`${domain} screenshot`}
                  className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(transparent, hsl(var(--card)))" }} />
              </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/30 mt-2 font-light">Skärmdump tagen vid analystillfället</p>
          </motion.div>
        )}
      </div>

      {/* AI Summary */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="relative mt-8 p-5 rounded-2xl border border-border/10"
          style={{ background: "linear-gradient(135deg, hsla(215,100%,60%,0.04) 0%, hsla(175,95%,50%,0.03) 50%, hsla(320,90%,60%,0.03) 100%)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 10%, hsla(175,95%,50%,0.2) 50%, transparent 90%)" }} />
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-neon-cyan/15 mt-0.5" style={{ background: "hsla(175,95%,50%,0.08)" }}>
              <BarChart3 className="w-4 h-4 text-neon-cyan" />
            </div>
            <div>
              <p className="data-label text-[0.58rem] text-neon-cyan/60 mb-1.5">Sammanfattning</p>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">{summary}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Scores */}
      {categoryScores && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="relative mt-6 pt-6 border-t border-border/10"
        >
          <p className="text-xs font-semibold font-display text-center mb-1">Var problemet ligger</p>
          <p className="text-[10px] text-muted-foreground/50 font-light text-center mb-5">Så här presterar din hemsida inom viktiga områden</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {categoryConfig.map((cat, i) => {
              const s = categoryScores[cat.key];
              const catColor = s >= 75
                ? { ring: "hsl(var(--score-high))", glow: "hsla(160,85%,50%,0.3)", bg: "hsla(160,85%,50%,0.06)" }
                : s >= 55
                ? { ring: "hsl(var(--score-mid))", glow: "hsla(40,95%,55%,0.3)", bg: "hsla(40,95%,55%,0.06)" }
                : { ring: "hsl(var(--score-low))", glow: "hsla(0,80%,58%,0.3)", bg: "hsla(0,80%,58%,0.06)" };
              const circ = 2 * Math.PI * 22;
              const offset = circ - (s / 100) * circ;
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/8 hover:border-border/20 transition-all duration-300 group cursor-default"
                  style={{ background: catColor.bg }}
                >
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                    <motion.div
                      className="absolute inset-[-3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ boxShadow: `0 0 12px ${catColor.glow}` }}
                    />
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="22" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2" opacity="0.3" />
                      <circle
                        cx="26" cy="26" r="22" fill="none"
                        stroke={catColor.ring} strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 5px ${catColor.glow})` }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-mono tabular-nums" style={{ color: catColor.ring, textShadow: `0 0 10px ${catColor.glow}` }}>{s}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-5 h-5 mx-auto mb-1 rounded-md flex items-center justify-center" style={{ background: catColor.bg }}>
                      <cat.icon className="w-3 h-3" style={{ color: catColor.ring }} />
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground/70 leading-tight block font-medium">{cat.label}</span>
                    {cat.weight && <span className="text-[9px] text-muted-foreground/30 font-light">{cat.weight}</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ScoreBlock;
