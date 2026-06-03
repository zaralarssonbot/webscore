import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import webscoreLogo from "@/assets/webscore-logo.png";

interface NavbarProps {
  onAnalyze?: () => void;
}

// Hash links point to real homepage section ids; route links go to pages.
const links = [
  { href: "#services", label: "Tjänster" },
  { href: "#process-steps", label: "Så fungerar det" },
  { href: "/guider", label: "Guider" },
  { href: "/pricing", label: "Priser" },
];

const Navbar = ({ onAnalyze }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Route links navigate; hash links smooth-scroll to a homepage section
  // (navigating home first when triggered from another page).
  const handleNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpen(false);
    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 140);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="/" className="inline-flex items-center min-h-[44px] -my-1 group">
            <img src={webscoreLogo} alt="Webscore" className="h-10 sm:h-12 w-auto transition-transform duration-300 group-hover:scale-105" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-9">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNav(e, l.href)}
                className="data-label text-[0.74rem] text-muted-foreground/80 hover:text-foreground transition-colors relative group cursor-pointer"
              >
                {l.label}
                <span className="absolute -bottom-1.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" style={{ background: "linear-gradient(90deg, hsl(var(--neon-cyan)), transparent)" }} />
              </a>
            ))}
            <button
              onClick={onAnalyze}
              className="text-sm font-semibold text-white bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple px-5 py-2 rounded-lg shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] transition-[transform,box-shadow,filter] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_10px_26px_hsl(var(--neon-blue)/0.36)] active:translate-y-0 active:brightness-100"
            >
              Analysera nu
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Stäng meny" : "Öppna meny"}
            aria-expanded={open}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden rounded-xl p-4 mb-4 space-y-1 border border-border bg-card/95 backdrop-blur-xl shadow-lg"
          >
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => handleNav(e, l.href)} className="flex items-center min-h-[44px] px-2 -mx-2 rounded-lg data-label text-[0.74rem] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                {l.label}
              </a>
            ))}
            <button
              onClick={() => { setOpen(false); onAnalyze?.(); }}
              className="w-full min-h-[44px] text-sm font-semibold text-white bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple px-5 py-3 rounded-lg mt-2 shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] transition-[transform,box-shadow,filter] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-[1.06] active:translate-y-0"
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
