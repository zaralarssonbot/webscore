/**
 * Site-wide background — clean, light and SEAMLESS.
 *
 * A single fixed layer behind all content: a near-white page with one very
 * subtle teal→blue→purple gradient wash that sits behind the hero and fades
 * smoothly to nothing. Because it's one continuous fixed layer (and sections
 * are transparent), the page reads as a single uninterrupted surface — no hard
 * edges or bands where one section meets the next.
 *
 * The old dark WebGL aurora + heavy glow belonged to the dark theme and has
 * been removed (this also keeps three.js out of the bundle entirely).
 */
const BackgroundEffect = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-background overflow-hidden">
      {/* Soft brand wash behind the hero — fades out by ~70% height, no edge. */}
      <div
        className="absolute inset-x-0 top-0 h-[88vh]"
        style={{
          background:
            "radial-gradient(120% 78% at 50% -8%, hsl(var(--neon-purple) / 0.10) 0%, hsl(var(--neon-blue) / 0.07) 32%, hsl(var(--neon-cyan) / 0.04) 52%, transparent 72%)",
        }}
      />
    </div>
  );
};

export default BackgroundEffect;
