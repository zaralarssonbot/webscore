import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

// --- Canvas Animation ---
const CinematicCanvas = ({ isVisible }: { isVisible: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number; life: number; maxLife: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        hue: [160, 190, 220][Math.floor(Math.random() * 3)],
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 200,
      });
    }

    // Data streams (flowing lines)
    const streams: { x: number; y: number; speed: number; length: number; hue: number; delay: number }[] = [];
    for (let i = 0; i < 12; i++) {
      streams.push({
        x: Math.random() * canvas.offsetWidth,
        y: -Math.random() * canvas.offsetHeight,
        speed: 0.5 + Math.random() * 1.5,
        length: 40 + Math.random() * 80,
        hue: [160, 190][Math.floor(Math.random() * 2)],
        delay: Math.random() * 300,
      });
    }

    // Nodes (expanding connection points)
    const nodes: { x: number; y: number; radius: number; pulseSpeed: number; hue: number }[] = [];
    for (let i = 0; i < 6; i++) {
      nodes.push({
        x: 0.15 + Math.random() * 0.7,
        y: 0.2 + Math.random() * 0.6,
        radius: 3 + Math.random() * 4,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        hue: [160, 190, 220][Math.floor(Math.random() * 3)],
      });
    }

    // Rising graph bars
    const bars = Array.from({ length: 5 }, (_, i) => ({
      x: 0.55 + i * 0.06,
      height: 0.1 + Math.random() * 0.25,
      hue: 160,
    }));

    const draw = () => {
      if (!isVisible) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      timeRef.current++;
      const t = timeRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      // Central AI entity glow
      const cx = w * 0.5;
      const cy = h * 0.45;
      const breathe = Math.sin(t * 0.015) * 0.15 + 0.85;

      // Outer halo
      const haloR = 120 * breathe;
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      haloGrad.addColorStop(0, `hsla(160, 100%, 50%, ${0.08 * breathe})`);
      haloGrad.addColorStop(0.4, `hsla(190, 100%, 50%, ${0.04 * breathe})`);
      haloGrad.addColorStop(1, "transparent");
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);

      // Inner core
      const coreR = 35 * breathe;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, `hsla(160, 100%, 60%, ${0.5 * breathe})`);
      coreGrad.addColorStop(0.6, `hsla(190, 100%, 50%, ${0.15 * breathe})`);
      coreGrad.addColorStop(1, "transparent");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting rings
      ctx.strokeStyle = `hsla(160, 100%, 50%, ${0.12 * breathe})`;
      ctx.lineWidth = 0.5;
      for (let r = 0; r < 3; r++) {
        const ringR = 50 + r * 30;
        ctx.beginPath();
        const startAngle = t * 0.005 * (r % 2 === 0 ? 1 : -1);
        ctx.arc(cx, cy, ringR * breathe, startAngle, startAngle + Math.PI * 1.3);
        ctx.stroke();
      }

      // Connection lines between nodes and core
      for (const node of nodes) {
        const nx = node.x * w;
        const ny = node.y * h;
        const pulse = Math.sin(t * node.pulseSpeed) * 0.5 + 0.5;

        // Line to core
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = `hsla(${node.hue}, 100%, 50%, ${0.06 * pulse})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Node point
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        const nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.radius * 2);
        nGrad.addColorStop(0, `hsla(${node.hue}, 100%, 60%, ${0.4 * pulse})`);
        nGrad.addColorStop(1, "transparent");
        ctx.fillStyle = nGrad;
        ctx.fill();
      }

      // Data streams
      for (const s of streams) {
        if (t < s.delay) continue;
        s.y += s.speed;
        if (s.y > h + s.length) {
          s.y = -s.length;
          s.x = Math.random() * w;
        }
        const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.length);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, `hsla(${s.hue}, 100%, 50%, 0.15)`);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + s.length);
        ctx.stroke();
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
        ctx.fill();
      }

      // Rising graph bars (bottom right area)
      const barBaseX = w * 0.62;
      const barBaseY = h * 0.7;
      const barW = w * 0.03;
      const barGap = w * 0.045;
      const growProgress = Math.min(1, Math.max(0, (t - 60) / 120));
      for (let i = 0; i < bars.length; i++) {
        const barH = bars[i].height * h * 0.3 * growProgress * (0.5 + Math.sin(t * 0.02 + i) * 0.15 + 0.5);
        const bx = barBaseX + i * barGap;
        const by = barBaseY - barH;
        const bGrad = ctx.createLinearGradient(bx, by, bx, barBaseY);
        bGrad.addColorStop(0, `hsla(160, 100%, 50%, 0.3)`);
        bGrad.addColorStop(1, `hsla(160, 100%, 50%, 0.05)`);
        ctx.fillStyle = bGrad;
        ctx.fillRect(bx, by, barW, barH);
      }

      // Scan line effect
      const scanY = ((t * 0.5) % h);
      const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `hsla(160, 100%, 50%, 0.06)`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 2, w, 4);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isVisible]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// --- Text phrases ---
const phrases = [
  { text: "Mer synlighet", icon: "📈" },
  { text: "Starkare förstaintryck", icon: "✨" },
  { text: "Omvandla besökare till kunder", icon: "🎯" },
  { text: "Byggd för tillväxt", icon: "🚀" },
  { text: "Powered by AI", icon: "🧠" },
];

const CinematicAISection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-100px" });
  const isMobile = useIsMobile();
  const [activePhrase, setActivePhrase] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActivePhrase((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: isMobile ? "70vh" : "90vh", minHeight: isMobile ? 480 : 600 }}
    >
      {/* Dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(216 28% 5%) 30%, hsl(216 30% 4%) 70%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Canvas animation */}
      {!isMobile && <CinematicCanvas isVisible={isInView} />}

      {/* Mobile: simplified static glow */}
      {isMobile && (
        <div className="absolute inset-0">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, hsla(160,100%,50%,0.1) 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, hsla(190,100%,50%,0.12) 0%, transparent 60%)", animationDelay: "1s" }}
          />
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass-card glow-border px-4 py-1.5 mb-8 text-[10px] font-medium tracking-[0.25em] uppercase flex items-center gap-2"
          style={{ color: "hsl(var(--neon-green))" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--neon-green))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--neon-green))" }} />
          </span>
          AI-driven transformation
        </motion.div>

        {/* Rotating phrases */}
        <div className="relative h-20 sm:h-24 md:h-28 flex items-center justify-center mb-6 overflow-hidden">
          {phrases.map((phrase, i) => (
            <motion.h2
              key={phrase.text}
              className="absolute text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight"
              initial={false}
              animate={{
                opacity: activePhrase === i ? 1 : 0,
                y: activePhrase === i ? 0 : activePhrase > i ? -40 : 40,
                scale: activePhrase === i ? 1 : 0.9,
              }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="gradient-text">{phrase.text}</span>
            </motion.h2>
          ))}
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl font-light leading-relaxed mb-10"
        >
          En bättre hemsida är inte bara design – den driver verkliga affärsresultat.
          <br className="hidden sm:block" />
          Mer synlighet. Mer förtroende. Fler kunder.
        </motion.p>

        {/* Phrase indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="flex gap-2"
        >
          {phrases.map((_, i) => (
            <button
              key={i}
              onClick={() => setActivePhrase(i)}
              className="relative h-1 rounded-full transition-all duration-500"
              style={{
                width: activePhrase === i ? 32 : 8,
                background: activePhrase === i
                  ? "hsl(var(--neon-green))"
                  : "hsl(var(--muted-foreground) / 0.3)",
                boxShadow: activePhrase === i ? "0 0 10px hsla(160,100%,50%,0.4)" : "none",
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
      />
    </section>
  );
};

export default CinematicAISection;
