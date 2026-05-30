import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import webscoreLogo from "@/assets/webscore-logo.png";

interface NavbarProps {
  onAnalyze?: () => void;
}

const Navbar = ({ onAnalyze }: NavbarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center group">
            <img src={webscoreLogo} alt="Webscore" className="h-10 sm:h-12 w-auto" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light">Funktioner</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light">Så fungerar det</a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light">Priser</a>
            <button
              onClick={onAnalyze}
              className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-5 py-2 rounded-lg transition-all hover:shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]"
            >
              Analysera nu
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-muted-foreground hover:text-foreground">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden glass-card rounded-xl p-4 mb-4 space-y-3 border border-border/20"
          >
            <a href="#features" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Funktioner</a>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Så fungerar det</a>
            <a href="/pricing" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Priser</a>
            <button
              onClick={() => { setOpen(false); onAnalyze?.(); }}
              className="w-full text-sm font-medium text-primary-foreground bg-primary px-5 py-2.5 rounded-lg"
            >
              Analysera nu
            </button>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
