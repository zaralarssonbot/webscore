import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Search, MousePointerClick, Shield, Zap, Lock, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { AuditCheck } from "@/lib/scan-service";

interface AuditEvidenceProps {
  checks: AuditCheck[];
}

// Restraint: one teal accent across categories; colour is reserved for pass/fail.
const ACCENT_HUE = 175;
const categoryMeta: Record<string, { label: string; icon: typeof Search; hue: number }> = {
  seo: { label: "SEO & Synlighet", icon: Search, hue: ACCENT_HUE },
  conversion: { label: "Konvertering", icon: MousePointerClick, hue: ACCENT_HUE },
  trust: { label: "Förtroende", icon: Shield, hue: ACCENT_HUE },
  performance: { label: "Prestanda", icon: Zap, hue: ACCENT_HUE },
  security: { label: "Säkerhet", icon: Lock, hue: ACCENT_HUE },
};

const AuditEvidence = ({ checks }: AuditEvidenceProps) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const categories = ["seo", "conversion", "trust", "performance", "security"];

  return (
    <div className="space-y-3">
      {categories.map((cat, catIndex) => {
        const meta = categoryMeta[cat];
        const catChecks = checks.filter((c) => c.category === cat);
        const passed = catChecks.filter((c) => c.passed).length;
        const total = catChecks.length;
        const isOpen = expandedCat === cat;
        const Icon = meta.icon;
        const passRate = total > 0 ? passed / total : 0;

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIndex * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="card-surface rounded-xl overflow-hidden relative group hover:!translate-y-0"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-[2px]"
              style={{
                background: `linear-gradient(180deg, hsl(${meta.hue} 90% 55%) 0%, transparent 100%)`,
                opacity: 0.4,
              }}
            />

            <button
              onClick={() => setExpandedCat(isOpen ? null : cat)}
              className="w-full flex items-center gap-3 p-4 pl-5 hover:bg-secondary/15 transition-all duration-300"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ background: `hsla(${meta.hue},90%,55%,0.07)`, borderColor: `hsla(${meta.hue},90%,55%,0.12)` }}
              >
                <Icon className="w-4 h-4" style={{ color: `hsl(${meta.hue} 90% 55%)` }} />
              </div>
              <span className="font-semibold text-sm flex-1 text-left font-display">{meta.label}</span>

              <div className="w-16 h-1.5 rounded-full bg-secondary/40 overflow-hidden mr-2">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${passRate * 100}%` }}
                  transition={{ delay: 0.3 + catIndex * 0.1, duration: 0.8, ease: "easeOut" }}
                  style={{
                    background: passRate >= 0.7 ? "hsl(var(--score-high))" : passRate >= 0.4 ? "hsl(var(--score-mid))" : "hsl(var(--score-low))",
                  }}
                />
              </div>

              <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                {passed}/{total}
              </span>

              <div className="flex gap-[3px] mr-1">
                {catChecks.map((c, i) => (
                  <motion.div
                    key={i}
                    className="w-[6px] h-[6px] rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + catIndex * 0.05 + i * 0.03 }}
                    style={{
                      background: c.passed ? "hsl(var(--score-high))" : "hsl(var(--score-low))",
                      boxShadow: c.passed ? "0 0 4px hsla(160,85%,50%,0.4)" : "0 0 4px hsla(0,80%,58%,0.4)",
                      opacity: c.impact === "high" ? 1 : c.impact === "medium" ? 0.7 : 0.4,
                    }}
                  />
                ))}
              </div>
              <ChevronDown
                className="w-4 h-4 text-muted-foreground transition-transform duration-300"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
              />
            </button>

            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-border/15"
              >
                <div className="p-4 space-y-2">
                  {catChecks.map((check, i) => (
                    <motion.div
                      key={check.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-secondary/8 border border-border/8 hover:bg-secondary/15 transition-colors"
                    >
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-score-high shrink-0 mt-0.5" style={{ filter: "drop-shadow(0 0 4px hsla(160,85%,50%,0.4))" }} />
                      ) : (
                        <XCircle className="w-4 h-4 text-score-low shrink-0 mt-0.5" style={{ filter: "drop-shadow(0 0 4px hsla(0,80%,58%,0.4))" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{check.label}</span>
                          <span
                            className="data-label text-[0.5rem] px-2 py-0.5 rounded-full border"
                            style={{
                              background: check.impact === "high" ? "hsla(0,80%,58%,0.07)" : check.impact === "medium" ? "hsla(40,95%,55%,0.07)" : "hsla(220,20%,50%,0.07)",
                              color: check.impact === "high" ? "hsl(var(--score-low))" : check.impact === "medium" ? "hsl(var(--score-mid))" : "hsl(var(--muted-foreground))",
                              borderColor: check.impact === "high" ? "hsla(0,80%,58%,0.15)" : check.impact === "medium" ? "hsla(40,95%,55%,0.15)" : "hsla(220,20%,50%,0.12)",
                            }}
                          >
                            {check.impact === "high" ? "hög" : check.impact === "medium" ? "medel" : "låg"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-light mt-1.5 leading-relaxed">{check.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default AuditEvidence;
