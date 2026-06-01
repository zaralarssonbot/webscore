import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface CustomerLossCardProps {
  score: number;
}

const CustomerLossCard = ({ score }: CustomerLossCardProps) => {
  // Qualitative risk tied to the score band — the magnitude scales with the
  // score, but we deliberately avoid a fabricated percentage (it's a derived
  // estimate, not a measurement).
  const risk =
    score >= 80
      ? { level: "Liten", phrase: "en liten del" }
      : score >= 65
        ? { level: "Betydande", phrase: "en betydande del" }
        : { level: "Stor", phrase: "en stor del" };

  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden group">
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "inset 0 0 80px hsla(0,80%,58%,0.04)" }} />

      <div className="flex items-center gap-3 mb-4 relative">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-score-low/20 shrink-0"
          style={{ background: "hsla(0,80%,58%,0.1)" }}
          animate={{ boxShadow: ["0 0 0px hsla(0,80%,58%,0)", "0 0 15px hsla(0,80%,58%,0.15)", "0 0 0px hsla(0,80%,58%,0)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <AlertTriangle className="w-4.5 h-4.5 text-score-low" />
        </motion.div>
        <div>
          <h2 className="text-base font-semibold font-display tracking-[-0.01em]">Ni kan tappa kunder varje dag</h2>
          <p className="data-label text-[0.5rem] text-score-low/60 mt-0.5">UPPSKATTAD RISK BASERAT PÅ ANALYSEN</p>
        </div>
      </div>

      <div className="relative flex items-center gap-4 p-4 rounded-xl border border-score-low/10" style={{ background: "hsla(0,80%,58%,0.04)" }}>
        <div className="flex flex-col items-center shrink-0 text-center">
          <motion.span
            className="font-display font-bold text-2xl sm:text-3xl text-score-low tracking-tight"
            style={{ textShadow: "0 0 24px hsla(0,80%,58%,0.35)" }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 18 }}
          >
            {risk.level}
          </motion.span>
          <span className="data-label text-[0.5rem] text-muted-foreground/50 mt-1.5">RISKNIVÅ</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground/80 leading-[1.6]">
            Ni riskerar att tappa <span className="text-foreground font-medium">{risk.phrase}</span> av potentiella kunder online, främst till konkurrenter som är bättre optimerade digitalt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLossCard;
