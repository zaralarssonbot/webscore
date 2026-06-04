/**
 * Site-wide background — clean, dark and SEAMLESS.
 *
 * A single fixed layer behind all content: a deep dark page with one contained
 * teal→blue→purple gradient wash that sits behind the hero and fades smoothly
 * to nothing. Because it's one continuous fixed layer (and sections are
 * transparent), the page reads as a single uninterrupted surface — no hard
 * edges or bands where one section meets the next.
 *
 * Deliberately NOT the old murky full-screen aurora: the brand glow is contained
 * to the top of the hero and dissolves cleanly into the dark base (and three.js
 * stays out of the bundle entirely).
 */
const BackgroundEffect = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-background overflow-hidden">
      {/* Contained brand wash behind the hero — pops on dark, fades out by ~70%
          height with no visible edge. */}
      <div
        className="absolute inset-x-0 top-0 h-[88vh]"
        style={{
          background:
            "radial-gradient(120% 78% at 50% -8%, hsl(var(--neon-purple) / 0.18) 0%, hsl(var(--neon-blue) / 0.12) 32%, hsl(var(--neon-cyan) / 0.07) 52%, transparent 72%)",
        }}
      />
    </div>
  );
};

export default BackgroundEffect;
