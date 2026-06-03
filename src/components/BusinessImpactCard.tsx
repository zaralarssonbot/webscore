import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";

interface BusinessImpactCardProps {
  impacts: string[];
}

const BusinessImpactCard = ({ impacts }: BusinessImpactCardProps) => {
  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 relative">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-neon-orange/20 bg-neon-orange/[0.08] shrink-0">
          <TrendingDown className="w-4 h-4 text-neon-orange" />
        </div>
        <div>
          <h2 className="text-base font-semibold font-display tracking-[-0.01em]">Vad detta betyder för ditt företag</h2>
          <p className="data-label text-[0.72rem] text-muted-foreground/80 mt-0.5">KONKRET AFFÄRSPÅVERKAN</p>
        </div>
      </div>

      <div className="space-y-2.5 relative">
        {impacts.map((impact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border"
          >
            <span className="w-5 h-5 rounded-full bg-neon-orange/12 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[0.74rem] font-bold text-neon-orange tabular-nums">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground/80 leading-[1.6]">{impact}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BusinessImpactCard;
