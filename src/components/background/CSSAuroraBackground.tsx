/**
 * CSS aurora fallback — used when WebGL is unavailable or the user prefers
 * reduced motion. Pure presentational, GPU-cheap (transform/opacity only).
 * Mirrors the palette of the WebGL background so the two are interchangeable.
 */
const CSSAuroraBackground = ({ animated = true }: { animated?: boolean }) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-background" />

      {/* Aurora mesh — drifting teal → blue → purple */}
      <div
        className="absolute top-[-20%] left-[8%] h-[1000px] w-[1000px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(175,95%,50%,0.10) 0%, hsla(175,95%,50%,0.03) 32%, transparent 60%)",
          animation: animated ? "aurora-1 26s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="absolute bottom-[-18%] left-[-8%] h-[900px] w-[900px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(258,80%,58%,0.10) 0%, hsla(258,80%,58%,0.03) 32%, transparent 60%)",
          animation: animated ? "aurora-2 32s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="absolute top-[28%] right-[-10%] h-[760px] w-[760px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(215,92%,56%,0.09) 0%, hsla(215,92%,56%,0.03) 32%, transparent 60%)",
          animation: animated ? "aurora-3 29s ease-in-out infinite" : undefined,
        }}
      />

      {/* Living grid */}
      <div className="absolute inset-0 bg-grid-live opacity-60" />

      {/* Vignette to pull focus to center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, hsl(var(--background) / 0.85) 100%)",
        }}
      />
    </div>
  );
};

export default CSSAuroraBackground;
