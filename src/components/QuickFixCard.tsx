import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface QuickFixCardProps {
  fix: string;
}

const QuickFixCard = ({ fix }: QuickFixCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden group"
    >
      <div className="accent-line-top accent-line-cyan" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(ellipse at top, hsla(175,95%,50%,0.04) 0%, transparent 60%)" }} />

      <div className="flex items-start gap-3 relative">
        <motion.div
          className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15 shrink-0"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Zap className="w-4 h-4 text-primary" />
        </motion.div>
        <div>
          <h2 className="text-sm font-semibold font-display mb-1">Snabb åtgärd</h2>
          <p className="text-muted-foreground text-sm font-light leading-relaxed">{fix}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickFixCard;
