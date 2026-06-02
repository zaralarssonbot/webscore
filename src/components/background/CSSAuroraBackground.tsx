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

      {/* Aurora mesh — drifting teal → blue → purple. Kept LOW and tightly
          contained (fades out by ~50%) so glow defines, never floods. */}
      <div
        className="absolute top-[-22%] left-[6%] h-[860px] w-[860px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(175,95%,50%,0.07) 0%, hsla(175,95%,50%,0.02) 28%, transparent 50%)",
          animation: animated ? "aurora-1 26s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[-10%] h-[780px] w-[780px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(258,80%,58%,0.07) 0%, hsla(258,80%,58%,0.02) 28%, transparent 50%)",
          animation: animated ? "aurora-2 32s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="absolute top-[30%] right-[-12%] h-[660px] w-[660px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsla(215,92%,56%,0.06) 0%, hsla(215,92%,56%,0.02) 28%, transparent 50%)",
          animation: animated ? "aurora-3 29s ease-in-out infinite" : undefined,
        }}
      />

      {/* Living grid */}
      <div className="absolute inset-0 bg-grid-live opacity-45" />

      {/* Vignette to pull focus to center and keep edges calm */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.9) 100%)",
        }}
      />
    </div>
  );
};

export default CSSAuroraBackground;
