/**
 * THE DRONE SEQUENCE
 *
 * Six locked clips played as one continuous journey, scrubbed by scroll:
 * Stockholm from the air → the tower facade → a terrace → through the glass →
 * across the room → the blank white screen.
 *
 * A → B → C → BR → D → E. BR is a bridge generated to replace the dead stretch
 * where C decelerated to a standstill; D, E and the portal are untouched.
 *
 * The film is finished and must not change. Camera path, timing and cut points
 * were measured frame by frame and are documented in
 * `approved-media/CHAIN.md`; the numbers below are read from that document, not
 * chosen here. This module only decides which frame of which clip belongs to a
 * given scroll position.
 *
 * Delivery is 1440p re-encoded with a six-frame GOP. That decision was a
 * performance one, not a quality one, and it was settled by benchmark: the
 * sequence is seeked on every scroll frame, and seek cost is set by GOP length,
 * not by resolution. Numbers in `approved-media/CHAIN.md`.
 */

// Two characters, not one: the bridge is `BR`. The glob was `?-*` while every
// clip had a single-letter id.
//
// One glob per DELIVERY quality, never `*-*`. That pattern matched every file
// sitting in the folder, so the production bundle carried all 33 of them —
// 275 MB of mp4, of which a visitor ever requests 46. The rest was the m4k
// benchmark set (89 MB), the superseded g6m8 encodes (19 MB) and, worst, the
// 4K archive masters and ungraded 1080 sources (~94 MB): hashed into
// `dist/assets` and downloadable by anyone who guessed the URL, which is the
// exact opposite of the rule that the master is an archive and must not be
// delivered to clients. Masters stay in `approved-media/`; this folder ships
// only what the page can actually play.
const CLIPS = {
  ...import.meta.glob("../../assets/immersive/chain/*-m1440.mp4", { eager: true, query: "?url", import: "default" }),
  ...import.meta.glob("../../assets/immersive/chain/*-m1080.mp4", { eager: true, query: "?url", import: "default" }),
} as Record<string, string>;
const STILLS = {
  ...import.meta.glob("../../assets/immersive/chain/blend-C-first-1440.jpg", { eager: true, query: "?url", import: "default" }),
  ...import.meta.glob("../../assets/immersive/chain/blend-C-first-1080.jpg", { eager: true, query: "?url", import: "default" }),
} as Record<string, string>;

/**
 * `m1440` is the delivery format: 2560×1440, H.264, 24 fps, GOP 6, no B-frames,
 * ~14 Mbps, encoded from the locked 4K master.
 *
 * A seek must decode from the nearest keyframe forward, so the source's
 * one-second GOP cost up to 24 frames of work per seek and took 50 ms; six
 * frames costs 16.7, which is exactly one frame at 60 Hz. The film went from
 * following the scroll at 33 fps to 59, and the files got *smaller* — 19.1 MB
 * against 22.3 — because a shorter GOP does not need a high bitrate to hold up.
 *
 * The other two are kept for comparison only. `1080` is the ungraded source and
 * `4k` the archive master, which measured 13 fps of film with 66 ms hitches: more
 * pixels per frame, far fewer frames.
 */
export type Quality = "m1440" | "m1080";
const QUALITIES: Quality[] = ["m1440", "m1080"];

/**
 * The delivery encode this visitor gets.
 *
 * `?q=` still wins, so the two can be compared in one browser. `m4k` is gone
 * from the list because it is gone from the bundle: it was never served, it
 * measured 13 fps of scrubbed film, and shipping it put the archive master on
 * a public URL.
 *
 * Otherwise m1440, downgraded to m1080 only on POSITIVE evidence that the link
 * cannot carry it. That direction is deliberate. Throttled to Fast 4G the chain
 * stalls hard — 29% of frames stale and a 735 ms freeze — and 1080 is a real
 * remedy at 26.5 MB against 46.3, measured by `delivery-1080/README.md` at the
 * same 16.7 ms seek and 59.2 fps, with a frame difference under a tenth of the
 * clip's own motion. But the evidence has to be positive: Network Information
 * is Chromium-only, so defaulting to 1080 whenever it is missing would hand
 * every Safari and Firefox visitor the softer encode on a fibre line. Guessing
 * wrong downward is a permanent quality regression for most people; guessing
 * wrong upward is a stutter only for someone whose connection was already
 * going to struggle. Neither is free, and this is the cheaper mistake.
 */
export function qualityFromUrl(): Quality {
  if (typeof window === "undefined") return "m1440";
  const q = new URLSearchParams(window.location.search).get("q") as Quality | null;
  if (q && QUALITIES.includes(q)) return q;

  const c = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; saveData?: boolean };
  }).connection;
  if (!c) return "m1440";
  if (c.saveData) return "m1080";
  if (c.effectiveType && c.effectiveType !== "4g") return "m1080";
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 5) return "m1080";
  return "m1440";
}

export interface ChainClip {
  id: "A" | "B" | "C" | "BR" | "D" | "E";
  /** Seconds of the clip this edit uses. */
  from: number;
  to: number;
  /**
   * Where the blend toward the next clip's first frame begins, in clip time.
   * Only B has one: it ends with the sliding panel closed and C opens with it
   * open, and everything else in those two frames matches to within 0.6 of a
   * frame. Nothing else in the chain needs one — A→B measured 0.78 frames, and
   * C→BR and BR→D are hard cuts by design.
   */
  blendFrom?: number;
}

/**
 * The edit.
 *
 * B stops at 4.15 s rather than its full 4.20833: the blend has reached the
 * still by then, so the frames after it are never seen. That is also where the
 * clip's one defect lives — passthrough trimming left its last two frames
 * pixel-identical — so the edit discards it either way.
 *
 * C, BR and D are the repaired passage. C ends at 3.75 because everything after
 * it is a deceleration to a standstill: motion falls from 5–10 per frame to
 * 1.0–1.4 from t = 4.05 onward, and the old cut sat a full second inside that
 * dead stretch, where the eye had all the time it needed to compare two frames
 * that did not match.
 *
 * The bridge replaces that stretch while moving. It never decelerates — 10 to 12
 * per frame throughout, ending at 11.0 — because its end image is a frame taken
 * mid-flight out of locked D rather than a composed destination, so the model
 * had nothing to park on. Two attempts at regenerating D itself both braked to a
 * halt against a composed end frame; that history is in `_lattice-r3/SEAM-REPAIR.md`.
 *
 * Only the middle of the bridge is used. Its last 1.667 s — 42 % of the clip —
 * is travel past D's entry point and is discarded. The start handle turned out
 * to be zero: the search picked the bridge's own first frame, because the
 * model's approximation of the start image was the closest it ever came to C
 * and every later frame drifted further.
 *
 * D is entered at 2.475 and is otherwise untouched. Its last frame, D→E and the
 * portal are unchanged by construction — no re-encode, no new file, only a later
 * entry point into the same locked clip.
 *
 * Both cut points were searched for, not chosen: every frame of the outgoing
 * clip was compared against every frame of the incoming one, and the winner was
 * ranked by difference divided by the outgoing clip's own motion, because that
 * motion is what has to hide the error. Measured on the delivery encodes:
 *
 *   C 3.750 → BR 0.000    1.22 frames of C's own motion
 *   BR 2.333 → D 2.475    0.76 frames of D's own motion
 *   the old C → D         3.15 frames
 *
 * The two new cuts have a *larger* raw difference than the old one (5.9 and 6.0
 * against 2.8). That is not a defect, and it is why the ratio matters: the old
 * cut is small because nothing moves across it. Enlarged, the old cut shows the
 * chair changing shape in place — armrest tube, rib count, seat mount all
 * differ — while the new cuts show the same chair, same shape, displaced. A
 * displacement reads as motion; a re-interpretation reads as a cut.
 */
export const CHAIN: ChainClip[] = [
  { id: "A", from: 0, to: 5.04167 },
  { id: "B", from: 0, to: 4.15, blendFrom: 3.87 },
  // C's cut frame is number 90, which *starts* at 3.75, so `to: 3.75` never
  // shows it: the scrub reaches 3.749 and stops, and frame 89 is the last thing
  // on screen. Verified in the browser — the displayed pair measured 7.31
  // against the intended 5.89. The bound has to sit inside frame 90's span,
  // [3.7500, 3.7917), and 3.77 leaves margin at both ends.
  { id: "C", from: 0, to: 3.77 },
  { id: "BR", from: 0, to: 2.33333 },
  { id: "D", from: 2.475, to: 5.04167 },
  { id: "E", from: 0, to: 5.04167 },
];

/**
 * Where the last clip's picture becomes a flat field of the page's own colour.
 *
 * Measured on E: bezel, desk, lamp and walls are outside the frame from frame
 * 102, t = 4.271 s, and nothing darker than 231 remains anywhere after it. So
 * the flatten may not begin before then — there is nothing left to hide, which
 * is the whole condition. It completes with a hold to spare, so the field is
 * already flat and exact before the page scrolls over it.
 */
// One frame after the room clears, not on it. Measured on the delivery encode,
// dark reaches 0 % at frame 102, t = 4.271 s exactly — so starting there leaves
// no margin at all, and a single frame of drift in any future re-encode would
// begin the colour match while a sliver of room was still in shot.
const FLATTEN_FROM = 4.313;
const FLATTEN_TO = 4.95;

export const CLIP_SECONDS = CHAIN.map((c) => c.to - c.from);
export const TOTAL_SECONDS = CLIP_SECONDS.reduce((a, b) => a + b, 0);

/** Glob keys are relative to this module, so they carry the assets path. */
const CLIP_DIR = "../../assets/immersive/chain";

export function clipUrl(id: string, q: Quality): string {
  const key = `${CLIP_DIR}/${id}-${q}.mp4`;
  const url = CLIPS[key];
  if (!url) throw new Error(`Missing chain clip: ${key}`);
  return url;
}

/**
 * The frame the B→C blend mixes toward, at the delivery mode's own resolution.
 *
 * One rung per quality, and m1440 now has its own.
 *
 * It used to borrow the 1080p still, on the reasoning that the delivery encode
 * "carries the same pictures". It does not carry them at the same size: m1440 is
 * 2560×1440, so at the one blended seam the picture the video was mixing INTO
 * was a third smaller on every axis than the video it was mixing OUT of, and the
 * seam softened for the duration of the blend. The 1440 rung is a resample of
 * the locked 4K still — same frame, no re-render, no new picture.
 *
 * The 4K rung went with `?q=m4k`. The still it pointed at is no longer globbed
 * either — a 1.5 MB JPEG that only the retired benchmark mode ever asked for.
 */
const STILL_FOR: Record<Quality, string> = { m1080: "1080", m1440: "1440" };

export function blendStillUrl(q: Quality): string {
  const key = STILL_FOR[q];
  const url = STILLS[`${CLIP_DIR}/blend-C-first-${key}.jpg`];
  if (!url) throw new Error(`Missing blend still for ${key}`);
  return url;
}

export interface ChainAt {
  index: number;
  /** 0..1 toward the flat page colour. Non-zero only in the tail of the last clip. */
  flatten: number;
  /** Time to seek the current clip to. */
  time: number;
  /** 0..1 toward the next clip's first frame. Non-zero only inside B's blend. */
  blend: number;
}

/**
 * Scroll position → which clip, which frame, how much blend.
 *
 * Linear in time: every second of film gets the same amount of scroll. The
 * sequence is one continuous camera move, so easing it per clip would make the
 * camera speed up and slow down at cut points that are meant to be invisible.
 */
export function chainAt(progress: number): ChainAt {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  let t = p * TOTAL_SECONDS;
  for (let i = 0; i < CHAIN.length; i++) {
    const c = CHAIN[i];
    const span = c.to - c.from;
    if (t <= span || i === CHAIN.length - 1) {
      const time = c.from + Math.min(t, span);
      let blend = 0;
      if (c.blendFrom !== undefined && time > c.blendFrom) {
        const x = Math.min(1, (time - c.blendFrom) / (c.to - c.blendFrom));
        blend = x * x * (3 - 2 * x);   // smoothstep, no linear onset
      }
      let flatten = 0;
      if (i === CHAIN.length - 1 && time > FLATTEN_FROM) {
        const x = Math.min(1, (time - FLATTEN_FROM) / (FLATTEN_TO - FLATTEN_FROM));
        flatten = x * x * (3 - 2 * x);
      }
      return { index: i, time, blend, flatten };
    }
    t -= span;
  }
  return { index: CHAIN.length - 1, time: CHAIN[CHAIN.length - 1].to, blend: 0, flatten: 1 };
}
