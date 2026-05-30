import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface ComparisonBarsProps {
  score: number;
}

const ComparisonBars = ({ score }: ComparisonBarsProps) => {
  const industryAvg = Math.min(95, score + Math.round(Math.random() * 6 + 5));
  const topScore = Math.min(95, score + Math.round(Math.random() * 10 + 15));

  const bars = [
    { label: "Din hemsida", value: score, color: score >= 75 ? "hsl(var(--score-high))" : score >= 60 ? "hsl(var(--score-mid))" : "hsl(var(--score-low))" },
    { label: "Branschsnitt", value: industryAvg, color: "hsl(var(--neon-blue))" },
    { label: "Toppresterande", value: topScore, color: "hsl(var(--score-high))" },
  ];

  return (
    <div className="glass-card p-6 sm:p-7 rounded-2xl relative overflow-hidden">
      <div className="accent-line-top accent-line-blue" />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-neon-blue/10 flex items-center justify-center border border-neon-blue/15">
          <BarChart3 className="w-4 h-4 text-neon-blue" />
        </div>
        <h2 className="text-base font-semibold font-display">Hur du ligger till</h2>
      </div>

      <div className="space-y-4">
        {bars.map((bar, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-light">{bar.label}</span>
              <span className="text-sm font-semibold font-display" style={{ color: bar.color }}>{bar.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary/30 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bar.value}%` }}
                transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full relative"
                style={{
                  background: `linear-gradient(90deg, ${bar.color}cc, ${bar.color})`,
                  boxShadow: `0 0 12px ${bar.color}30`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonBars;
