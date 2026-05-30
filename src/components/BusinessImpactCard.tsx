import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";

interface BusinessImpactCardProps {
  impacts: string[];
}

const BusinessImpactCard = ({ impacts }: BusinessImpactCardProps) => {
  return (
    <div className="glass-card-elevated p-6 sm:p-7 rounded-2xl relative overflow-hidden">
      <div className="accent-line-top accent-line-orange" />
      <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 80px hsla(25,100%,58%,0.02)" }} />

      <div className="flex items-center gap-3 mb-4 relative">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-neon-orange/15" style={{ background: "hsla(25,100%,58%,0.08)" }}>
          <TrendingDown className="w-4 h-4 text-neon-orange" />
        </div>
         <div>
          <h2 className="text-base font-semibold font-display">Vad detta betyder för ditt företag</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Konkret affärspåverkan</p>
        </div>
      </div>

      <div className="space-y-2.5 relative">
        {impacts.map((impact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-neon-orange/5 border border-neon-orange/8"
          >
            <span className="w-5 h-5 rounded-full bg-neon-orange/12 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-neon-orange font-display">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">{impact}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BusinessImpactCard;
