import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, MousePointerClick, Shield, Zap, Lock, type LucideIcon } from "lucide-react";
import { scoreColor, alpha } from "@/lib/score-color";

interface CategoryScoreCardProps {
  label: string;
  score: number;
  icon: LucideIcon;
  weight: string;
  delay: number;
}

const CategoryScoreCard = ({ label, score, icon: Icon, weight, delay }: CategoryScoreCardProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0;
      const step = score / 30;
      const interval = setInterval(() => {
        current += step;
        if (current >= score) {
          setDisplayScore(score);
          clearInterval(interval);
        } else {
          setDisplayScore(Math.round(current));
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [score, delay]);

  const c = scoreColor(score);
  const ring = c.hsl;
  const bg = alpha(c, 0.06);
  const glow = alpha(c, 0.12);
  const border = alpha(c, 0.1);
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-5 rounded-2xl flex flex-col items-center gap-3 relative overflow-hidden group hover:scale-[1.04] transition-all duration-300 cursor-default"
      style={{ boxShadow: `0 0 25px ${glow}`, borderColor: border }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent 20%, ${ring}50, transparent 80%)` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${glow}, transparent 70%)` }} />

      <div className="relative w-[72px] h-[72px]">
        <motion.div
          className="absolute inset-[-4px] rounded-full"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay / 1000 }}
          style={{ boxShadow: `0 0 15px ${glow}` }}
        />
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2" opacity="0.3" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            stroke={ring} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-display" style={{ color: ring, textShadow: `0 0 15px ${glow}` }}>{displayScore}</span>
        </div>
      </div>
      <div className="text-center relative">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-md flex items-center justify-center border" style={{ background: bg, borderColor: border }}>
            <Icon className="w-3 h-3" style={{ color: ring }} />
          </div>
          <span className="text-xs font-semibold">{label}</span>
        </div>
        {weight && <span className="text-[12px] text-muted-foreground/80 font-light">{weight}</span>}
      </div>
    </motion.div>
  );
};

export const categoryConfig = [
  { key: "seo" as const, label: "Hittbarhet", icon: Search, weight: "" },
  { key: "conversion" as const, label: "Konvertering", icon: MousePointerClick, weight: "" },
  { key: "trust" as const, label: "Förtroende", icon: Shield, weight: "" },
  { key: "performance" as const, label: "Hastighet", icon: Zap, weight: "" },
  { key: "security" as const, label: "Säkerhet", icon: Lock, weight: "" },
];

export default CategoryScoreCard;
