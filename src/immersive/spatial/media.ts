/**
 * The environment's shared shape.
 *
 * The environment is rendered as a VideoTexture on a frustum-filling quad
 * inside the Spatial canvas — NOT as a DOM layer.
 *
 * Why: measured on this machine, a full-viewport DOM `<video>` cost ~11 fps
 * while the page was re-compositing on every scroll frame. Shrinking that
 * layer's composite to 2×2 px restored 60 fps with decoding untouched, and
 * removing the WebGL canvas entirely changed nothing — so the cost was the
 * second compositor layer, not decode and not three.js. Drawing the video as a
 * texture inside the canvas that is already being composited removes that layer.
 *
 * Exactly one video element exists and exactly one source is ever loaded. When
 * the journey crosses into a new clip, the outgoing frame is copied into a
 * canvas texture and that still is what fades out, so the hand-over looks
 * identical to a two-video cross-fade without ever holding two videos in memory.
 *
 * WHAT USED TO BE HERE
 * A per-chapter media table — `MEDIA`, `ChapterMedia`, `mediaOpacity`,
 * `resolveMedia` — from before the drone chain became the whole environment.
 * Nothing had imported any of it since; the chain in `chain.ts` decides what is
 * on screen, and `App.tsx` and `Backdrop.tsx` take only `MediaState` and
 * `MEDIA_ASPECT` from this file.
 *
 * It was not merely dead, it was expensive. Its `url()` helper resolved assets
 * as `new URL(`./${file}`, import.meta.url)`, and a template literal cannot be
 * resolved statically, so Vite emitted EVERY file in this folder as a build
 * asset to be safe. That is how `dist/assets` came to hold `hero-bg.mp4`,
 * `ch01-tech.mp4` and `ch02-experiences.mp4` — 19 MB no visitor ever requests,
 * one of them already documented here as "never referenced, so it is never
 * fetched" — along with `App.tsx`, `chain.ts` and eleven more source files,
 * published verbatim next to the bundle.
 */

/** Media aspect ratio, used to emulate `object-fit: cover` on the quad. */
export const MEDIA_ASPECT = 16 / 9;

export interface MediaState {
  /** Opacity of the live video quad. */
  videoOpacity: number;
  /** Opacity of the frozen outgoing frame. */
  freezeOpacity: number;
  /**
   * Readability scrim over the environment. Chapters carry one; the hero does
   * not — it is approved exactly as it stands.
   */
  scrimOpacity: number;
  /** Set when the video source changed and the texture needs rebinding. */
  sourceChanged: boolean;
  /**
   * True while the clip is scrubbed rather than played. A paused video pushes
   * no new frames, so the VideoTexture has to be invalidated by hand or the
   * seek never reaches the screen.
   */
  scrubbing: boolean;
  /** Which media the video element currently holds, or -1 for none. */
  current: number;
  /**
   * 0..1 toward the still that opens the next clip, used only at the B→C seam.
   * Drawn behind the video, which is faded to (1 - blend) on top of it — the two
   * together are a straight mix, without needing a second video decoded at once.
   */
  blendOpacity: number;
  /** 0..1 toward the flat page colour, at the very end of the last clip. */
  flatten: number;
}
