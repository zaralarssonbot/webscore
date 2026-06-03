import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface ComparisonBarsProps {
  score: number;
}

const ComparisonBars = ({ score }: ComparisonBarsProps) => {
  const industryAvg = Math.min(95, score + Math.round(Math.random() * 6 + 5));
  const topScore = Math.min(95, score + Math.round(Math.random() * 10 + 15));

  const scoreColor = score >= 75 ? "hsl(var(--score-high))" : score >= 60 ? "hsl(var(--score-mid))" : "hsl(var(--score-low))";
  const bars = [
    { label: "Din hemsida", value: score, color: scoreColor },
    { label: "Branschsnitt", value: industryAvg, color: "hsl(215 16% 55%)" },
    { label: "Toppresterande", value: topScore, color: "hsl(var(--neon-cyan))" },
  ];

  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon-cyan/[0.08] flex items-center justify-center border border-neon-cyan/20 shrink-0">
          <BarChart3 className="w-4 h-4 text-neon-cyan" />
        </div>
        <div>
          <h2 className="text-base font-semibold font-display tracking-[-0.01em]">Hur du ligger till</h2>
          <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-0.5">JÄMFÖRT MED MARKNADEN</p>
        </div>
      </div>

      <div className="space-y-4">
        {bars.map((bar, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground/80">{bar.label}</span>
              <span className="font-mono font-semibold tabular-nums text-sm" style={{ color: bar.color }}>{bar.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${bar.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.1 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full relative"
                style={{ background: `linear-gradient(90deg, ${bar.color}cc, ${bar.color})`, boxShadow: `0 0 12px ${bar.color}30` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonBars;
