import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import pjDesktop from "@/assets/immersive/pj-featured-desktop.webp";
import pjMobile from "@/assets/immersive/pj-featured-mobile.webp";

/* ────────────────────────────────────────────────────────────────────────────
   FEATURED REVEAL — a project surface that rotates up to meet the reader.

   The interaction: the surface enters tilted back in 3D with real perspective,
   then rotates toward the viewer and settles flat and front-facing while
   growing slightly, all driven by scroll position rather than by a trigger. It
   should read as one physical object connected to the page, never as a card
   that animates in.

   Built on the project's existing dependencies — framer-motion, already here at
   v12 — and on the bright world's own CSS. No Tailwind, no second motion
   library, no new build setup, and nothing restructured to host it.

   Only `transform` and `opacity` are animated, so the whole thing composites on
   the GPU and never triggers layout. The scroll value is passed through a spring
   so that a fast flick cannot make the surface snap: the spring is what removes
   the visible relationship between scroll delta and rotation.

   Deliberately NOT the demo's styling. There is no dark laptop chrome, no black
   frame and no shadow stack — the surface is a white plate with one cool
   hairline and the same icy specular edge every other surface in this world
   carries.
   ──────────────────────────────────────────────────────────────────────────── */

export default function FeaturedReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Starts when the section's top reaches the bottom of the viewport and
  // completes well before it leaves, so the surface is flat and readable for
  // most of the time it is on screen rather than settling as it exits.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 });

  // Mobile gets its own numbers, not the desktop values at a smaller size: a
  // 20° tilt on a 390px screen reads as a broken layout rather than as depth.
  const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
  const tilt = isNarrow ? 8 : 20;
  const from = isNarrow ? 0.94 : 0.86;

  const rotateX = useTransform(eased, [0, 1], [tilt, 0]);
  const scale = useTransform(eased, [0, 1], [from, 1]);
  const y = useTransform(eased, [0, 1], [isNarrow ? 24 : 60, 0]);

  const style = reduced ? undefined : { rotateX, scale, y };

  return (
    <section className="bw-reveal" ref={ref} aria-labelledby="bw-reveal-h">
      <div className="bw-reveal-head">
        <p className="bw-station">03 — Utvalt arbete</p>
        <h2 id="bw-reveal-h" className="bw-h2">
          En sida som <em>reser sig.</em>
        </h2>
        <p className="bw-body">
          Hela ytan byggd av oss — rutnät, typografi, bild och rörelse i ett system.
        </p>
      </div>

      {/* The perspective lives on the parent, never on the animated element:
          a transformed element cannot establish perspective for itself. */}
      <div className="bw-reveal-stage">
        {/* A real capture of the live Papa Jun site at 1440 CSS × DPR 2, not a
            render and not an upscale. Both files are cut from that one master.

            The desktop file stops above Papa Jun's own scroll-mouse indicator,
            which was being captured with the page and then read as a stray
            Webscore control sitting at the bottom of the plate.

            The mobile file is a 4:5 crop around the headline block that starts
            BELOW the menu row. Cropping through it — which is what the previous
            frame did — left "BOKA" chopped in half at 834, and a half-word from
            somebody else's navigation looks like a broken image, not a crop. */}
        <motion.figure className="bw-reveal-plate" style={style}>
          <picture>
            <source media="(max-width: 860px)" srcSet={pjMobile} width={1280} height={1600} />
            <img
              src={pjDesktop}
              alt="Startsidan för Papa Jun: solnedgång över Mälaren med publik framför en scen, serifrubriken Välkommen till en smakfull stund vid Mälaren, och knappar för dagens lunch, meny och bordsbokning."
              width={2560}
              height={1626}
              loading="lazy"
              decoding="async"
            />
          </picture>
          <figcaption>
            <span className="bw-cap-k">✓ Kundprojekt</span>
            <span className="bw-cap-v">Papa Jun — restaurang, Kvicksund</span>
          </figcaption>
        </motion.figure>
      </div>

      <div className="bw-reveal-foot">
        <a className="btn btn-primary" href="#projekt">
          Se hela arbetet <span className="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
