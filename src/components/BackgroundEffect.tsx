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

      {/* Aurora mesh — drifting teal → blue → purple (pre-blurred gradients, transform-animated) */}
      <div
        className="absolute top-[-20%] left-[8%] w-[1000px] h-[1000px] rounded-full will-change-transform"
        style={{
          background: "radial-gradient(circle, hsla(175,95%,50%,0.10) 0%, hsla(175,95%,50%,0.03) 32%, transparent 60%)",
          animation: "aurora-1 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-18%] left-[-8%] w-[900px] h-[900px] rounded-full will-change-transform"
        style={{
          background: "radial-gradient(circle, hsla(258,80%,58%,0.10) 0%, hsla(258,80%,58%,0.03) 32%, transparent 60%)",
          animation: "aurora-2 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[28%] right-[-10%] w-[760px] h-[760px] rounded-full will-change-transform"
        style={{
          background: "radial-gradient(circle, hsla(215,92%,56%,0.09) 0%, hsla(215,92%,56%,0.03) 32%, transparent 60%)",
          animation: "aurora-3 29s ease-in-out infinite",
        }}
      />

      {/* Living grid */}
      <div className="absolute inset-0 bg-grid-live opacity-60" />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-30" />

      {/* Vignette to pull focus to center */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 25%, hsl(var(--background) / 0.85) 100%)" }}
      />
    </div>
  );
};

export default BackgroundEffect;
