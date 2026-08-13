import * as THREE from "three";

/**
 * THE LATTICE — Webscore's spatial system.
 *
 * One instanced point-field of N nodes that morphs between five named states as
 * the page scrolls. The metaphor: an unformed system being shaped — which is
 * literally what the studio does. Every state is generated procedurally from a
 * seeded PRNG, so there are no imported models, textures or third-party assets.
 *
 * Positions for every state are precomputed once into Float32Arrays; each frame
 * we lerp between the two bracketing states. That keeps per-frame work to a
 * single pass of vector math over a typed array — no allocation, no GC churn.
 */

export const NODE_COUNT = 1400;
export const NODE_COUNT_MOBILE = 420;

/** Deterministic PRNG so the composition is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StateName = "core" | "capabilities" | "field" | "path" | "point";
export const STATE_ORDER: StateName[] = ["core", "capabilities", "field", "path", "point"];

/** Five capability clusters — the labels rendered in HTML, not in WebGL. */
export const CAPABILITIES = ["Strategi", "Design", "Utveckling", "Innehåll", "AI"] as const;

function fibonacciSphere(i: number, n: number, radius: number) {
  const k = i + 0.5;
  const phi = Math.acos(1 - (2 * k) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * k;
  return new THREE.Vector3(
    Math.cos(theta) * Math.sin(phi) * radius,
    Math.sin(theta) * Math.sin(phi) * radius,
    Math.cos(phi) * radius,
  );
}

/** Build the position buffer for one state. */
function buildState(state: StateName, count: number, rand: () => number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let v: THREE.Vector3;

    switch (state) {
      // 1. CORE — a shell with a soft inner scatter. Reads as a single object.
      case "core": {
        const shell = fibonacciSphere(i, count, 2.05);
        const jitter = 0.16 * (rand() - 0.5);
        v = shell.multiplyScalar(1 + jitter);
        break;
      }

      // 2. CAPABILITIES — five discrete clusters on a wide ring.
      case "capabilities": {
        const cluster = i % 5;
        const a = (cluster / 5) * Math.PI * 2 - Math.PI / 2;
        const centre = new THREE.Vector3(Math.cos(a) * 3.5, Math.sin(a) * 1.5, Math.sin(a * 2) * 0.9);
        const local = fibonacciSphere(Math.floor(i / 5), Math.ceil(count / 5), 0.62);
        v = centre.add(local.multiplyScalar(0.7 + rand() * 0.5));
        break;
      }

      // 3. FIELD — a receding plane. Becomes the backdrop behind the work.
      case "field": {
        const cols = Math.ceil(Math.sqrt(count * 2));
        const rows = Math.ceil(count / cols);
        const cx = (i % cols) / cols - 0.5;
        const cz = Math.floor(i / cols) / rows - 0.5;
        // Pushed further back and down than the other states: this is the one
        // moment the field must yield the page to the work. Fog does the rest.
        v = new THREE.Vector3(
          cx * 17,
          -2.5 + Math.sin(cx * 7) * Math.cos(cz * 6) * 0.28,
          cz * 18 - 5,
        );
        break;
      }

      // 4. PATH — a double helix reading as a route through the work.
      case "path": {
        const t = i / count;
        const strand = i % 2 === 0 ? 0 : Math.PI;
        const turns = 3.1;
        v = new THREE.Vector3(
          Math.cos(t * Math.PI * 2 * turns + strand) * 1.5,
          (t - 0.5) * 9.5,
          Math.sin(t * Math.PI * 2 * turns + strand) * 1.5,
        );
        v.x += (rand() - 0.5) * 0.18;
        v.z += (rand() - 0.5) * 0.18;
        break;
      }

      // 5. POINT — everything converges. Calm, resolved, for the final CTA.
      case "point": {
        const s = fibonacciSphere(i, count, 0.38);
        v = s.multiplyScalar(0.6 + rand() * 0.7);
        // Sits below the centre line so it reads as glow behind the CTA rather
        // than as noise across the closing copy. The final section is centred,
        // so this is the one state that must yield vertically.
        v.y -= 1.75;
        break;
      }
    }
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

export interface LatticeData {
  count: number;
  states: Record<StateName, Float32Array>;
  /** Per-node random 0..1, used for scale variance and stagger. */
  seeds: Float32Array;
}

export function buildLattice(count: number): LatticeData {
  const states = {} as Record<StateName, Float32Array>;
  for (const s of STATE_ORDER) {
    // Re-seed per state so each is deterministic but distinct.
    states[s] = buildState(s, count, mulberry32(STATE_ORDER.indexOf(s) * 9973 + 17));
  }
  const rand = mulberry32(4242);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = rand();
  return { count, states, seeds };
}

/**
 * Map global scroll progress (0..1) to a state pair + local blend.
 * Segment boundaries deliberately sit slightly before the matching HTML section
 * so the form has already begun changing when the copy arrives.
 */
/**
 * How present the field is at a given scroll progress, 0..1.
 *
 * The work and services stretch is the deliberate calm in the page's rhythm
 * (ART-DIRECTION §7): the field withdraws so the projects own the screen. This
 * also guarantees legibility — copy in that stretch never competes with nodes,
 * whatever the morph happens to be doing behind it.
 */
export function fieldPresence(progress: number): number {
  const smooth = (x: number, a: number, b: number) => {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };
  // Window retuned against the shipped page rather than the prototype's section
  // layout. Measured section fractions at 1440: hero 0–0.125, the five-column
  // "Ett system som tar form" band 0.125–0.204, work 0.204–0.575, services
  // 0.575–0.708. The original 0.15→0.26 ramp meant the band's three right-hand
  // columns were read against a full-strength dispersed field — the one place on
  // the page where body copy genuinely competed with nodes.
  //
  // The band's columns are on screen at the START of its range, so withdrawal
  // has to be complete by ~0.12 rather than beginning there. Pulling the ramp
  // back to 0.05–0.12 is safe for the hero: its copy is driven to zero opacity
  // by progress 0.1 (heroFade in ImmersiveHome), so the field is at full
  // strength for the whole time the hero is actually legible, and only recedes
  // as the hero itself scrolls away.
  //
  // The 0.6→0.78 recovery is unchanged: the field returns as the services rows
  // give way to the creative-technology section, which is *about* the 3D.
  const dip = smooth(progress, 0.05, 0.12) * (1 - smooth(progress, 0.6, 0.78));
  return 1 - 0.8 * dip;
}

export function resolveMorph(progress: number): {
  from: StateName;
  to: StateName;
  /** Eased blend, for position interpolation. */
  t: number;
  /** Un-eased 0..1 within the segment, for effects that peak mid-transition. */
  raw: number;
} {
  const segs = STATE_ORDER.length - 1; // 4 transitions
  const p = Math.min(Math.max(progress, 0), 0.9999) * segs;
  const idx = Math.floor(p);
  const raw = p - idx;
  // Smootherstep (Perlin): zero first AND second derivative at both ends, so the
  // form settles into each state instead of arriving at constant velocity.
  // Plain smoothstep still reads slightly mechanical at these durations.
  const t = raw * raw * raw * (raw * (raw * 6 - 15) + 10);
  return { from: STATE_ORDER[idx], to: STATE_ORDER[idx + 1], t, raw };
}
