interface HeroObjectProps {
  className?: string;
}

/**
 * The Webscore hero object — "Mark I": a black basalt cube with a perfectly
 * centered circular void, shot as premium product photography (Apple industrial
 * design / Tadao Ando light + shadow). This is the locked hero centerpiece.
 *
 * Presented as a single calm, contained plate: a hairline-framed image that
 * drifts with an extremely slow CSS float (see `.hero-float` in index.css).
 * No rings, no gauge, no score readout, no scan visuals, no glow.
 *
 * LCP-critical: the image is eager + high fetch priority, with intrinsic
 * dimensions set to avoid layout shift.
 */
const HeroObject = ({ className }: HeroObjectProps) => {
  return (
    <div
      className={`hero-float relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] shadow-[var(--shadow-depth-3)] ${className ?? ""}`}
    >
      <img
        src="/hero-mark-i.webp"
        width={1800}
        height={1005}
        alt="Webscore Mark I — en svart basaltkub med ett cirkulärt hålrum, sedd som premiumproduktfotografi."
        loading="eager"
        // @ts-expect-error fetchpriority is a valid HTML attribute not yet in React's types
        fetchpriority="high"
        decoding="async"
        className="block w-full h-auto select-none"
        draggable={false}
      />
      {/* A whisper of a top highlight so the framed plate reads as an object,
          not a flat sticker — no glow, just a 1px light edge. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.75rem]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
        aria-hidden="true"
      />
    </div>
  );
};

export default HeroObject;
