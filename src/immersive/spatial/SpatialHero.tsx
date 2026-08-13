import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";
import {
  CHAIN, chainAt, clipUrl, blendStillUrl, qualityFromUrl, type Quality,
} from "./chain";
import { createBackdrop, type Backdrop } from "./backdrop";
import type { MediaState } from "./media";
import flatHero from "@/assets/immersive/flat-hero.webp";
import "./spatial-hero.css";

/* ────────────────────────────────────────────────────────────────────────────
   THE SPATIAL HERO

   A locked six-clip drone sequence — Stockholm from the air, the Norra Tornen
   approach, the tower facade, a terrace, through the glass, across the room —
   scrubbed by scroll and handed to the page as a flat field of the page's own
   colour. The film, its edit and its cut points are approved and must not
   change; `chain.ts` only decides which frame of which clip belongs to a given
   scroll position.

   Two builds, chosen once at mount:

   DESKTOP mounts the canvas, creates one video element outside the document and
   scrubs the chain across a tall track.

   SMALL SCREENS AND COARSE POINTERS get the still — clip A's own first frame,
   the same picture desktop opens on — and create no video element at all, so no
   film is ever fetched there. That is a deliberate art direction, not a
   degradation: the chrome is cobalt BECAUSE the footage under it is golden
   hour, and a phone that got the cobalt without the film was meeting a
   different world, not a lighter one.
   ──────────────────────────────────────────────────────────────────────────── */

/** True when the visitor should get the still instead of the film. */
function preferStill() {
  return (
    window.matchMedia("(max-width: 860px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Height of the scrubbed track, in vh. Scrollable range is this minus one
 * viewport. Sized for the sequence: 22.9 s of film across 780vh of range is
 * roughly 34vh per second, slow enough that an ordinary scroll gesture does not
 * race the film.
 */
const TRACK_VH = 880;

const warmed = new Set<string>();

/**
 * Pull the next clip — and, cheaply, the previous one — into cache.
 *
 * `preload="auto"` only ever applies to the src the element currently holds, so
 * the next clip was first requested at the moment it was assigned. Measured
 * cold on a fast scroll: 38 ms to loadedmetadata but 206 ms to loadeddata — the
 * wait was fetch, not decode. A plain fetch fills the HTTP cache and nothing
 * else: no second element, no second decoder, no playback. The result is
 * deliberately dropped; the cache is the whole product.
 */
function warmNext(index: number, quality: Quality) {
  for (const i of [index + 1, index - 1]) {
    const clip = CHAIN[i];
    if (!clip) continue;
    const url = clipUrl(clip.id, quality);
    if (warmed.has(url)) continue;
    warmed.add(url);
    fetch(url, { priority: "low" } as RequestInit)
      .then((r) => r.arrayBuffer())
      .catch(() => warmed.delete(url));
  }
}

/**
 * Match the freeze canvas to the clip's own coded size.
 *
 * Assigning `width` clears the canvas even when the value is identical, so the
 * comparison is not an optimisation — it is what stops a no-op resize from
 * wiping the frame being held.
 */
function sizeFreezeTo(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) return false;
  if (canvas.width === video.videoWidth && canvas.height === video.videoHeight) return false;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  return true;
}

interface Props {
  /** Rendered inside the hero, over the film. */
  children: React.ReactNode;
  /**
   * Fires when the film starts and stops covering the viewport, so the page can
   * put its own full-screen canvas to sleep behind it. Always false on the still
   * build, which has no canvas of its own to hide anything.
   */
  onCoverChange?: (covering: boolean) => void;
}

export default function SpatialHero({ children, onCoverChange }: Props) {
  const reduced = !!useReducedMotion();
  const still = useRef(typeof window === "undefined" ? true : preferStill()).current;
  const quality = useRef(typeof window === "undefined" ? ("m1440" as Quality) : qualityFromUrl()).current;
  const [failed, setFailed] = useState(false);
  const film = !still && !reduced && !failed;

  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const freezeRef = useRef<HTMLCanvasElement | null>(null);
  const backdropRef = useRef<Backdrop | null>(null);
  const lastProgress = useRef(0);
  const stateRef = useRef<MediaState>({
    videoOpacity: 0, freezeOpacity: 0, scrimOpacity: 0, sourceChanged: false,
    scrubbing: false, current: -1, blendOpacity: 0, flatten: 0,
  });

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  /**
   * The type departs; the film continues without it.
   *
   * In the prototype the headings sat on a CSS 3D rail and physically travelled
   * past the camera, so they were gone long before the last clip. Here the hero
   * content is a normal centred block, and left alone it stayed on screen for
   * the whole 880vh track — including the hand-over, where its contrast carriers
   * read as grey clouds over the film's final frames.
   *
   * Written straight to the node from the scroll handler rather than through a
   * `useTransform`. Driven declaratively the opacity faded correctly to 0 by 12%
   * and then climbed back to 0.99 by the end of the track while the matching `y`
   * stayed correctly clamped at -60 — two transforms disagreeing about one input,
   * so something outside this component was also writing opacity. This is the
   * same value the film is scrubbed by, applied the same way the rest of this
   * engine applies things: one ref, no React render per frame.
   */
  const innerRef = useRef<HTMLDivElement>(null);
  const applyTypeTravel = (v: number) => {
    const el = innerRef.current;
    if (!el) return;
    const t = Math.min(1, Math.max(0, v / 0.1));
    el.style.opacity = String(1 - t);
    el.style.transform = `translateY(${-60 * t}px)`;
    // Once it is gone it must not take clicks off the film behind it.
    el.style.pointerEvents = t > 0.98 ? "none" : "";
  };

  /** Scroll position → which clip, which frame, how much blend. */
  const syncRef = useRef<(v: number) => void>(() => {});
  syncRef.current = (v: number) => {
    lastProgress.current = v;
    const video = videoRef.current;
    const freeze = freezeRef.current;
    if (!video || !freeze) return;
    const state = stateRef.current;
    const at = chainAt(v);

    if (at.index !== state.current) {
      // Hold the outgoing frame across the swap. A fresh source has no decoded
      // picture for a few milliseconds and the texture would go black without it.
      if (state.current >= 0 && video.readyState >= 2 && video.videoWidth) {
        const ctx = freeze.getContext("2d");
        if (ctx) {
          sizeFreezeTo(freeze, video);
          ctx.drawImage(video, 0, 0, freeze.width, freeze.height);
          state.sourceChanged = true;
        }
      }
      state.current = at.index;
      video.src = clipUrl(CHAIN[at.index].id, quality);
      video.load();
      warmNext(at.index, quality);
    }

    const ready = video.readyState >= 2;
    state.videoOpacity = ready ? 1 : 0;
    state.freezeOpacity = ready ? 0 : 1;
    state.blendOpacity = at.blend;
    state.flatten = at.flatten;
    state.scrubbing = true;

    // Scroll drives the clip. Kept paused so playback never fights the scrub,
    // and only seeked when the target moves enough to matter — seeking every
    // frame on a fully buffered clip is what makes scrubbing stutter.
    if (!video.paused) video.pause();
    if (ready && Number.isFinite(video.duration)) {
      if (Math.abs(video.currentTime - at.time) > 0.02) video.currentTime = at.time;
    }
  };

  // One decode source, deliberately never appended to the document: it exists
  // only to feed the texture, so it can never become a compositor layer.
  useEffect(() => {
    if (!film) return;
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    const reapply = () => syncRef.current(lastProgress.current);
    v.addEventListener("loadeddata", reapply);
    v.addEventListener("seeked", reapply);

    // A 16×9 placeholder only so the texture has a legal backing store at mount.
    // The first loadedmetadata replaces it with the clip's own coded size, and
    // the freeze quad is invisible until then.
    const freeze = document.createElement("canvas");
    freeze.width = 16;
    freeze.height = 9;
    const sizeFreeze = () => {
      if (v.videoWidth && sizeFreezeTo(freeze, v)) stateRef.current.sourceChanged = true;
    };
    v.addEventListener("loadedmetadata", sizeFreeze);

    videoRef.current = v;
    freezeRef.current = freeze;
    // A fresh element holds no source, so forget which clip was bound — otherwise
    // a remount (StrictMode does one in development) leaves the new element
    // permanently empty because the state still says it is loaded.
    stateRef.current.current = -1;
    syncRef.current(lastProgress.current);

    return () => {
      v.removeEventListener("loadeddata", reapply);
      v.removeEventListener("seeked", reapply);
      v.removeEventListener("loadedmetadata", sizeFreeze);
      v.pause();
      v.removeAttribute("src");
      v.load();
      videoRef.current = null;
      freezeRef.current = null;
    };
  }, [film]);

  // The canvas, and the frame loop that feeds it.
  useEffect(() => {
    if (!film) return;
    const wrap = wrapRef.current;
    const video = videoRef.current;
    const freeze = freezeRef.current;
    if (!wrap || !video || !freeze) return;

    const backdrop = createBackdrop({
      wrap, video, freeze,
      blendStill: blendStillUrl(quality),
      onFailure: () => setFailed(true),
    });
    if (!backdrop) return;
    backdropRef.current = backdrop;

    // Only while the hero is on screen. Once the page has scrolled past it there
    // is nothing to draw and no reason to hold the main thread.
    let onscreen = true;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; }, { rootMargin: "120px" });
    io.observe(wrap);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (onscreen && visible) backdrop.frame(stateRef.current);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => backdrop.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      backdrop.dispose();
      backdropRef.current = null;
    };
  }, [film, quality]);

  // Tell the page whether the film is covering it. The stage is opaque and
  // sticky for the length of the track, so "the track is in view" is exactly
  // "nothing behind this is visible".
  const coverRef = useRef(onCoverChange);
  coverRef.current = onCoverChange;
  useEffect(() => {
    if (!film) { coverRef.current?.(false); return; }
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => coverRef.current?.(e.isIntersecting));
    io.observe(el);
    return () => { io.disconnect(); coverRef.current?.(false); };
  }, [film]);

  // Paint the opening frame before any scrolling has happened, then follow.
  useEffect(() => {
    if (!film) return;
    const v0 = scrollYProgress.get();
    syncRef.current(v0);
    applyTypeTravel(v0);
    return scrollYProgress.on("change", (v) => {
      syncRef.current(v);
      applyTypeTravel(v);
    });
  }, [film, scrollYProgress]);

  if (!film) {
    return (
      <section className="sp-hero sp-hero-still" id="top">
        <div className="sp-still" aria-hidden="true" style={{ backgroundImage: `url(${flatHero})` }} />
        <div className="sp-hero-inner">{children}</div>
      </section>
    );
  }

  return (
    <div className="sp-track" ref={trackRef} style={{ height: `${TRACK_VH}vh` }}>
      <div className="sp-stage">
        <div className="sp-canvas" ref={wrapRef} aria-hidden="true" />
        <section className="sp-hero" id="top">
          <div className="sp-hero-inner" ref={innerRef}>{children}</div>
        </section>
      </div>
    </div>
  );
}
