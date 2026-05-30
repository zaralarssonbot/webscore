import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle } from "lucide-react";

interface CustomerLossCardProps {
  score: number;
}

const CustomerLossCard = ({ score }: CustomerLossCardProps) => {
  const lossPercent = score >= 80 ? "10–20%" : score >= 65 ? "20–35%" : "30–45%";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card-elevated p-6 sm:p-7 rounded-2xl relative overflow-hidden group"
    >
      <div className="accent-line-top" style={{ background: "linear-gradient(90deg, transparent, hsla(0,80%,58%,0.5), hsla(25,100%,58%,0.4), transparent)" }} />
      <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 80px hsla(0,80%,58%,0.03)" }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(ellipse at center, hsla(0,80%,58%,0.04) 0%, transparent 60%)" }} />

      <div className="flex items-center gap-3 mb-4 relative">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-score-low/20"
          style={{ background: "hsla(0,80%,58%,0.1)" }}
          animate={{ boxShadow: ["0 0 0px hsla(0,80%,58%,0)", "0 0 15px hsla(0,80%,58%,0.15)", "0 0 0px hsla(0,80%,58%,0)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <AlertTriangle className="w-4.5 h-4.5 text-score-low" />
        </motion.div>
        <div>
          <h2 className="text-base font-semibold font-display">Ni kan tappa kunder varje dag</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uppskattad risk baserat på analysen</p>
        </div>
      </div>

      <div className="relative flex items-center gap-4 p-4 rounded-xl border border-score-low/10" style={{ background: "hsla(0,80%,58%,0.04)" }}>
        <div className="flex flex-col items-center shrink-0">
          <motion.span
            className="text-3xl sm:text-4xl font-extrabold font-display text-score-low"
            style={{ textShadow: "0 0 20px hsla(0,80%,58%,0.3)" }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {lossPercent}
          </motion.span>
          <span className="text-[10px] text-muted-foreground/50 font-light mt-1">potentiella kunder</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Ni riskerar att förlora <span className="text-foreground font-medium">{lossPercent}</span> av potentiella kunder online, främst till konkurrenter som är bättre optimerade digitalt.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerLossCard;
