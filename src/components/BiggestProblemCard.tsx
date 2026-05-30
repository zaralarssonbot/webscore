import { motion } from "framer-motion";
import { AlertOctagon } from "lucide-react";

interface BiggestProblemCardProps {
  problem: string;
}

const BiggestProblemCard = ({ problem }: BiggestProblemCardProps) => {
  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden group">
      {/* Meaningful warning accent */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "inset 0 0 60px hsla(0,80%,58%,0.04)" }} />

      <div className="flex items-center gap-3 mb-3 relative">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-score-low/25 shrink-0"
          style={{ background: "hsla(0,80%,58%,0.1)" }}
          animate={{ boxShadow: ["0 0 0px hsla(0,80%,58%,0)", "0 0 18px hsla(0,80%,58%,0.2)", "0 0 0px hsla(0,80%,58%,0)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <AlertOctagon className="w-4.5 h-4.5 text-score-low" />
        </motion.div>
        <div>
          <h2 className="text-base font-semibold font-display tracking-[-0.01em]">Det här gör att du tappar kunder</h2>
          <p className="data-label text-[0.5rem] text-score-low/60 mt-0.5">STÖRSTA PROBLEMET JUST NU</p>
        </div>
      </div>

      <p className="text-muted-foreground/80 leading-[1.7] text-sm relative">{problem}</p>
    </div>
  );
};

export default BiggestProblemCard;
