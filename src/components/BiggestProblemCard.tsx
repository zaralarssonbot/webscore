import { motion } from "framer-motion";
import { AlertOctagon } from "lucide-react";

interface BiggestProblemCardProps {
  problem: string;
}

const BiggestProblemCard = ({ problem }: BiggestProblemCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="glass-card-elevated p-6 sm:p-7 rounded-2xl relative overflow-hidden group"
    >
      <div className="accent-line-top" style={{ background: "linear-gradient(90deg, transparent, hsla(320,90%,60%,0.5), hsla(0,80%,58%,0.4), transparent)" }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(ellipse at top, hsla(0,80%,58%,0.05) 0%, transparent 60%)" }} />
      <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 60px hsla(0,80%,58%,0.03)" }} />

      <div className="flex items-center gap-3 mb-3 relative">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-score-low/25"
          style={{ background: "hsla(0,80%,58%,0.1)" }}
          animate={{ boxShadow: ["0 0 0px hsla(0,80%,58%,0)", "0 0 20px hsla(0,80%,58%,0.2)", "0 0 0px hsla(0,80%,58%,0)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <AlertOctagon className="w-4.5 h-4.5 text-score-low" />
        </motion.div>
        <div>
          <h2 className="text-base font-semibold font-display">Det här gör att du tappar kunder</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Det som kostar er flest kunder just nu</p>
        </div>
      </div>

      <p className="text-muted-foreground leading-relaxed font-light text-sm relative">{problem}</p>
    </motion.div>
  );
};

export default BiggestProblemCard;
