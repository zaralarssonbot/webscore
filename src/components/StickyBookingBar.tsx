import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyBookingBarProps {
  onBook: () => void;
  score: number;
}

const StickyBookingBar = ({ onBook, score }: StickyBookingBarProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div
            className="border-t border-border/20 backdrop-blur-xl"
            style={{ background: "hsla(220,25%,8%,0.92)" }}
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground font-light">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-neon-cyan" />
                  Tar 20 min
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-neon-cyan" />
                  Ingen förpliktelse
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-neon-cyan" />
                  Baserat på verklig data
                </span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs text-muted-foreground font-light hidden md:block">
                  Poäng: <span className="font-semibold text-foreground">{score}/100</span>
                </span>
                <Button
                  variant="glow-magenta"
                  size="lg"
                  onClick={onBook}
                  className="group whitespace-nowrap"
                >
                  Boka 20 min genomgång
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyBookingBar;
