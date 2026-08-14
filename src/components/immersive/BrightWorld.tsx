import { useEffect, useRef, useState } from "react";
import FeaturedReveal from "./FeaturedReveal";
import s1Desktop from "@/assets/immersive/bw-s1-cluster-desktop.webp";
import s1Mobile from "@/assets/immersive/bw-s1-cluster-mobile.webp";
import s2Desktop from "@/assets/immersive/bw-s2-monolith-desktop.webp";
import s2Mobile from "@/assets/immersive/bw-s2-monolith-mobile.webp";
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

      {/* ── SECTION 1 — establish the environment ──
          Reference 01: a pale icy field, one glass object held out of focus,
          roughly two thirds of the frame given to nothing. Density is
          deliberately the lowest on the site. */}
      <section className="bw-s1" aria-labelledby="bw-s1-h">
        {/* IMG-01, commissioned. Two crops rather than one scaled file: the
            mobile frame is recomposed tighter on the largest sphere so it
            survives bleeding off the right edge, instead of being the desktop
            square shrunk. */}
        <picture className="bw-shot bw-shot-01">
          <source media="(max-width: 860px)" srcSet={s1Mobile} />
          <img
            src={s1Desktop}
            alt="Tre munblåsta glaskulor i olika storlek på en vit kalkputsad yta, i kallt dagsljus från vänster."
            width={1240}
            height={1240}
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="bw-s1-copy">
          <p className="bw-station">01 — Miljön</p>
          <h2 id="bw-s1-h" className="bw-h2">
            Ljus, glas och <em>precision.</em>
          </h2>
          <p className="bw-body">
            Vi arbetar i kallt dagsljus och klara material. Ytan är ljus, formen
            är exakt, och färgen bor i ett enda objekt i taget.
          </p>
        </div>
      </section>

      {/* ── SECTION 2 — imagery, typography and glass together ──
          Reference 05: display type set large enough to pass BEHIND the white
          surface and be cropped by it, with blue glass held inside the surface.
          The image occupies the majority of the visual field. */}
      <section
        className={`bw-s2${two.arrived ? " is-in" : ""}`}
        ref={two.ref}
        aria-labelledby="bw-s2-h"
      >
        <h2 id="bw-s2-h" className="bw-behind" aria-hidden="true">Utvalt</h2>
        <span className="sr-only">Utvalt arbete</span>

        <figure className="bw-plate">
          {/* IMG-02, commissioned. The mobile source is a rebuilt 4:5 frame
              around the slab, not a centre crop — on a phone the display word
              sits above the plate rather than beside it, so the empty zone has
              to move with it. */}
          <picture className="bw-shot bw-shot-02">
            <source media="(max-width: 860px)" srcSet={s2Mobile} />
            <img
              src={s2Desktop}
              alt="En stor gjuten glasmonolit med frostade kanter står på blankt betonggolv med en tunn vattenhinna, i strykande dagsljus från höger."
              width={2400}
              height={1350}
              loading="lazy"
              decoding="async"
            />
          </picture>
          <figcaption>
            <span className="bw-cap-k">Material</span>
            <span className="bw-cap-v">Glas · kallt dagsljus</span>
          </figcaption>
        </figure>

        <div className="bw-s2-meta">
          <p className="bw-station">02 — Yta och typografi</p>
          <p className="bw-body">
            Bilden bär sektionen. Typografin ligger bakom ytan och skärs av den,
            så att de två läser som ett rum och inte som två lager.
          </p>
        </div>
      </section>

      {/* Section 3. Sections 1 and 2 are locked, so the reveal is added after
          them rather than replacing either. */}
      <FeaturedReveal />
    </div>
  );
}
