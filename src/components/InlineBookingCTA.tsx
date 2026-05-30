import { motion } from "framer-motion";
import { ArrowRight, Clock, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineBookingCTAProps {
  onBook: () => void;
}

const InlineBookingCTA = ({ onBook }: InlineBookingCTAProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 sm:p-7 rounded-2xl relative overflow-hidden text-center"
    >
      <div className="accent-line-top" style={{ background: "linear-gradient(90deg, transparent, hsla(320,90%,60%,0.4), hsla(175,95%,50%,0.3), transparent)" }} />

      <p className="text-base sm:text-lg font-semibold font-display mb-1.5 relative">
        Vill du veta exakt vad som bör ändras?
      </p>
      <p className="text-sm text-muted-foreground font-light mb-5 max-w-md mx-auto relative">
        Vi visar var du ligger efter och vad som ger störst effekt – helt kostnadsfritt.
      </p>

      <Button variant="glow-magenta" size="lg" onClick={onBook} className="group mb-4">
        Boka 20 min genomgång <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </Button>

      <div className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-muted-foreground/70 font-light">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-neon-cyan/60" />
          Tar 20 min
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-neon-cyan/60" />
          Ingen förpliktelse
        </span>
        <span className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-neon-cyan/60" />
          Visar vad som bör åtgärdas först
        </span>
      </div>
    </motion.div>
  );
};

export default InlineBookingCTA;
