import { useEffect, useRef, useState } from "react";

interface LazyVideoProps {
  /** Video source (e.g. "/hero-bg.mp4") */
  src: string;
  /** Optional poster still shown before the video loads (e.g. "/hero-poster.webp") */
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * How far outside the viewport (px) to begin loading. Larger for above-the-fold
   * heroes so playback is ready by first scroll; default suits below-the-fold.
   */
  rootMargin?: string;
}

/**
 * Autoplaying background video that never blocks first paint:
 * `preload="none"` and the real `src` is only attached once the element nears
 * the viewport (IntersectionObserver). Decorative-only — always muted, looped,
 * inline. Pass a `poster` to show a still frame until the video is ready.
 *
 * The observer stays live for the element's lifetime: the clip plays while in
 * view and PAUSES once it scrolls out, so off-screen videos don't keep decoding
 * (saves CPU/battery/data — important when several share a page).
 */
const LazyVideo = ({ src, poster, className, style, rootMargin = "300px" }: LazyVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);          // attach src on first entry
          el.play?.().catch(() => {});
        } else {
          el.pause?.();           // stop decoding once off-screen
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (load) ref.current?.load();
  }, [load]);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      poster={poster}
      className={className}
      style={style}
      src={load ? src : undefined}
    />
  );
};

export default LazyVideo;
