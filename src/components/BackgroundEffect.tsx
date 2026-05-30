import { useEffect, useRef } from "react";

const BackgroundEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Reduced from 50 to 20 particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        hue: [175, 215, 260][Math.floor(Math.random() * 3)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // No more O(n²) line connections — just draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Static glow orbs — NO blur filter, using pre-blurred radial gradients instead */}
      <div
        className="absolute top-[-15%] left-[20%] w-[900px] h-[900px] rounded-full opacity-80"
        style={{ background: "radial-gradient(circle, hsla(175,95%,50%,0.06) 0%, hsla(175,95%,50%,0.02) 30%, transparent 55%)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full opacity-80"
        style={{ background: "radial-gradient(circle, hsla(260,80%,55%,0.05) 0%, hsla(260,80%,55%,0.015) 30%, transparent 55%)" }}
      />
      <div
        className="absolute top-[35%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-80"
        style={{ background: "radial-gradient(circle, hsla(215,90%,55%,0.05) 0%, hsla(215,90%,55%,0.015) 30%, transparent 55%)" }}
      />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-grid opacity-15" />
      
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-40" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.8) 100%)" }}
      />
    </div>
  );
};

export default BackgroundEffect;
