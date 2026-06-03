import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface QuickFixCardProps {
  fix: string;
}

const QuickFixCard = ({ fix }: QuickFixCardProps) => {
  return (
    <div className="card-surface p-5 sm:p-6 relative overflow-hidden group">
      <div className="flex items-start gap-3 relative">
        <motion.div
          className="w-8 h-8 rounded-xl bg-neon-cyan/[0.08] flex items-center justify-center border border-neon-cyan/20 shrink-0"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Zap className="w-4 h-4 text-neon-cyan" />
        </motion.div>
        <div>
          <h2 className="data-label text-[0.72rem] text-neon-blue mb-1.5">SNABB ÅTGÄRD</h2>
          <p className="text-muted-foreground/80 text-sm leading-[1.6]">{fix}</p>
        </div>
      </div>
    </div>
  );
};

export default QuickFixCard;
