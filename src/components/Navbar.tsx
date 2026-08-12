import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandMark from "./BrandMark";
import Wordmark from "./Wordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { accountsEnabled } from "@/lib/account/limits";

interface NavbarProps {
  onAnalyze?: () => void;
}

// Path+hash links point to real homepage section ids; route links go to pages.
// These carry an explicit "/" prefix because the sections they target moved:
// the homepage is now the studio page (#tjanster / #process), while the old
// #services / #process-steps ids live on the analysis page at /analys.
const links = [
  { href: "/#tjanster", label: "Tjänster" },
  { href: "/#process", label: "Process" },
  { href: "/guider", label: "Guider" },
  { href: "/pricing", label: "Priser" },
];

const Navbar = ({ onAnalyze }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const showAccounts = accountsEnabled();

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
    const hash = href.indexOf("#");
    if (hash !== -1) {
      const path = href.slice(0, hash) || "/";
      const id = href.slice(hash + 1);
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      if (location.pathname !== path) {
        navigate(path);
        setTimeout(scroll, 140);
      } else {
        scroll();
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
          {/* Logo: score-ring mark + geometric wordmark — one unified lockup */}
          <a href="/" aria-label="Webscore – startsida" className="inline-flex items-center gap-2 sm:gap-2.5 min-h-[44px] -my-1 group">
            <BrandMark className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 transition-transform duration-300 group-hover:scale-105" title="" />
            <Wordmark className="text-xl sm:text-2xl" />
          </a>

          {/* Desktop nav — only from lg (1024px). Below that the logo, the four
              links, the account link and the CTA cannot fit on one line: at
              768–1023px they collided with the wordmark and wrapped. */}
          <div className="hidden lg:flex items-center gap-9">
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
            {showAccounts && (
              <a
                href={user ? "/app" : "/login"}
                onClick={(e) => { e.preventDefault(); navigate(user ? "/app" : "/login"); }}
                className="data-label text-[0.74rem] text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
              >
                {user ? "Mitt konto" : "Logga in"}
              </a>
            )}
            <Button onClick={onAnalyze}>
              Analysera nu
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Stäng meny" : "Öppna meny"}
            aria-expanded={open}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden rounded-xl p-4 mb-4 space-y-1 border border-border bg-card/95 backdrop-blur-xl shadow-lg"
          >
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => handleNav(e, l.href)} className="flex items-center min-h-[44px] px-2 -mx-2 rounded-lg data-label text-[0.74rem] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                {l.label}
              </a>
            ))}
            {/* Same account entry point as the desktop nav — it used to be desktop-only,
                so on phones there was no way to reach /login or /app. */}
            {showAccounts && (
              <a
                href={user ? "/app" : "/login"}
                onClick={(e) => { e.preventDefault(); setOpen(false); navigate(user ? "/app" : "/login"); }}
                className="flex items-center min-h-[44px] px-2 -mx-2 rounded-lg data-label text-[0.74rem] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                {user ? "Mitt konto" : "Logga in"}
              </a>
            )}
            <Button onClick={() => { setOpen(false); onAnalyze?.(); }} className="w-full mt-2">
              Analysera nu
            </Button>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
