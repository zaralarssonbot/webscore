import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MousePointerClick, Shield, Zap, Lock, Bot, Eye, Code, Database, Globe } from "lucide-react";

const categories = [
  { label: "SEO & Synlighet", icon: Search, hue: 175 },
  { label: "Konvertering", icon: MousePointerClick, hue: 25 },
  { label: "Förtroende", icon: Shield, hue: 260 },
  { label: "Prestanda", icon: Zap, hue: 215 },
  { label: "Säkerhet", icon: Lock, hue: 320 },
];

const robotSteps = [
  { text: "Ansluter till webbservern...", icon: Globe },
  { text: "Tar skärmdump av hemsidan...", icon: Eye },
  { text: "Läser källkoden...", icon: Code },
  { text: "Analyserar SEO-taggar...", icon: Search },
  { text: "Söker efter kontaktformulär...", icon: MousePointerClick },
  { text: "Kontrollerar SSL-certifikat...", icon: Lock },
  { text: "Räknar bilder & alt-texter...", icon: Eye },
  { text: "Mäter sidans storlek...", icon: Database },
  { text: "Granskar mobilanpassning...", icon: Zap },
  { text: "Söker sociala bevis...", icon: Shield },
  { text: "Jämför med branschstandard...", icon: Bot },
  { text: "Bygger din rapport...", icon: Bot },
];

interface LoadingStateProps {
  onComplete: () => void;
  screenshotUrl?: string | null;
  domain?: string;
}

const LoadingState = ({ onComplete, screenshotUrl, domain }: LoadingStateProps) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const [scanLineY, setScanLineY] = useState(0);
  const [foundItems, setFoundItems] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 0.5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = (prev + 1) % robotSteps.length;
        if (next === 3) setFoundItems(p => [...p, "title-tagg"]);
        if (next === 4) setFoundItems(p => [...p, "formulär"]);
        if (next === 5) setFoundItems(p => [...p, "SSL"]);
        if (next === 6) setFoundItems(p => [...p, "bilder"]);
        if (next === 8) setFoundItems(p => [...p, "viewport"]);
        return next;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanLineY(prev => (prev >= 100 ? 0 : prev + 0.5));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;
  const currentStep = robotSteps[stepIndex];
  const StepIcon = currentStep.icon;

  return (
    <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full max-w-5xl">
        
        {/* Screenshot preview */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md lg:max-w-lg flex-shrink-0"
        >
          <div className="glass-card rounded-xl overflow-hidden border border-border/30">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-secondary/20">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-score-low/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-score-mid/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-score-high/50" />
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-secondary/50 rounded-md px-3 py-1 text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1.5">
                  <Lock className="w-2.5 h-2.5 text-score-high" />
                  {domain ? `https://${domain}` : "https://..."}
                </div>
              </div>
            </div>

            <div className="relative aspect-[16/10] bg-secondary/15 overflow-hidden">
              {screenshotUrl ? (
                <motion.img
                  src={screenshotUrl}
                  alt={`Screenshot av ${domain}`}
                  className="w-full h-full object-cover object-top"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  transition={{ duration: 1 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Globe className="w-8 h-8 text-muted-foreground/25" />
                  </motion.div>
                </div>
              )}

              <motion.div
                className="absolute left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  top: `${scanLineY}%`,
                  background: "linear-gradient(90deg, transparent, hsl(var(--neon-cyan)), transparent)",
                  boxShadow: "0 0 20px hsl(var(--neon-cyan) / 0.5), 0 0 60px hsl(var(--neon-cyan) / 0.25)",
                }}
              />

              <div className="absolute inset-0 pointer-events-none opacity-15" style={{
                backgroundImage: `linear-gradient(hsl(var(--neon-cyan) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-cyan) / 0.1) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }} />

              <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/40 rounded-tl" />
              <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/40 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/40 rounded-bl" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/40 rounded-br" />

              <motion.div
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-primary/25"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Bot className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-medium text-primary">SKANNAR</span>
              </motion.div>

              <AnimatePresence>
                {foundItems.slice(-4).map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute px-2 py-0.5 rounded-full text-[8px] font-medium border"
                    style={{
                      left: `${15 + (i * 22) % 60}%`,
                      top: `${20 + (i * 25) % 55}%`,
                      background: "hsl(var(--neon-cyan) / 0.12)",
                      borderColor: "hsl(var(--neon-cyan) / 0.25)",
                      color: "hsl(var(--neon-cyan))",
                    }}
                  >
                    ✓ {item}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center lg:items-start gap-8 flex-1"
        >
          <div className="relative">
            <div className="absolute inset-0 -m-8">
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/10"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="absolute inset-0 -m-12 rounded-full animate-pulse-glow" style={{ background: "radial-gradient(circle, hsla(175,95%,50%,0.1) 0%, transparent 60%)" }} />

            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke="url(#progressGradNew)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
                />
                <defs>
                  <linearGradient id="progressGradNew" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(175 95% 50%)" />
                    <stop offset="100%" stopColor="hsl(215 100% 60%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary font-display" style={{ textShadow: "0 0 30px hsla(175,95%,50%,0.4)" }}>
                  {Math.min(Math.round(progress), 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground font-display">AI-robot arbetar</span>
              <motion.div className="flex gap-0.5 ml-auto" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="w-1 h-1 rounded-full bg-primary" />
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/15 bg-primary/5"
              >
                <StepIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground font-light">{currentStep.text}</span>
              </motion.div>
            </AnimatePresence>

            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: "linear-gradient(90deg, hsl(var(--neon-cyan)), hsl(var(--neon-blue)))",
                  boxShadow: "0 0 10px hsla(175,95%,50%,0.35)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-w-xs">
            {categories.map((cat, i) => {
              const isActive = i === activeCategory;
              return (
                <motion.div
                  key={cat.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all duration-500"
                  style={{
                    borderColor: isActive ? `hsla(${cat.hue},90%,55%,0.35)` : "hsl(var(--border))",
                    background: isActive ? `hsla(${cat.hue},90%,55%,0.07)` : "transparent",
                    color: isActive ? `hsl(${cat.hue} 90% 60%)` : "hsl(var(--muted-foreground))",
                  }}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                  {isActive && (
                    <motion.div
                      layoutId="loadingDot"
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: `hsl(${cat.hue} 90% 55%)` }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LoadingState;
