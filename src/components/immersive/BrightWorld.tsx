import { useEffect, useRef, useState } from "react";
import "./bright-world.css";

/* ────────────────────────────────────────────────────────────────────────────
   THE BRIGHT WORLD — the first two sections after the computer screen.

   The film ends as a flat #F1F4F8 field, so the page's first frame is that same
   colour and the hand-over is invisible. What follows is not a descent into a
   dark site: white and pale icy blue ARE the environment here, and the deep blue
   from the reference board is used only for type and for depth inside imagery.

   Sourced directly from the recovered board (WEBSCORE FÄRGER HEMSIDA, 7 Aug):
   reference 01 supplies the pale icy field with an out-of-focus glass object,
   03 the real-daylight white surface, 05 the white interface card carrying blue
   glass with display type passing behind it.

   The large forms below are built in CSS, not generated. They hold the exact
   composition — position, scale, share of the visual field — so it can be
   approved before any 4K master is commissioned. Each one is marked with a
   `data-slot` naming the image that will replace it.
   ──────────────────────────────────────────────────────────────────────────── */

/** Fires once when the element has been on screen; used for the arrival reveal. */
function useArrived<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setArrived(true); io.disconnect(); } },
      { rootMargin: "-8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, arrived };
}

export default function BrightWorld() {
  const arrival = useArrived<HTMLElement>();
  const two = useArrived<HTMLElement>();

  return (
    <div className="bw">
      {/* ── FIRST FRAME AFTER THE COMPUTER ──
          The white does not arrive; it is already here, because the film's last
          frame is this colour. What arrives is the icy blue, from inside the
          white, and then the words. No cut, no reset, no reveal animation on the
          ground itself. */}
      <section
        className={`bw-arrival${arrival.arrived ? " is-in" : ""}`}
        ref={arrival.ref}
        aria-labelledby="bw-arrival-h"
      >
        <div className="bw-glow" aria-hidden="true" />
        <div className="bw-arrival-inner">
          <p className="bw-eyebrow">Webscore</p>
          <h2 id="bw-arrival-h" className="bw-display">
            Inne i <em>skärmen.</em>
          </h2>
          <p className="bw-lede">
            Härifrån är allt du ser byggt av oss — gränssnitt, rörelse, innehåll
            och systemen bakom.
          </p>
        </div>
      </section>

    </div>
  );
}
