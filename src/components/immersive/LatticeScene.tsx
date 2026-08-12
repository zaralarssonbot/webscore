import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  buildLattice,
  resolveMorph,
  fieldPresence,
  NODE_COUNT,
  NODE_COUNT_MOBILE,
  type LatticeData,
} from "./lattice";

/* ────────────────────────────────────────────────────────────────────────────
   THE LATTICE — the only WebGL on the page. It is decorative by contract:
   every word of real content lives in semantic HTML above it. If this canvas
   never mounts (no WebGL, mobile, coarse pointer, load failure), the page still
   reads and converts.

   Ported from the approved prototype's @react-three/fiber implementation to
   imperative three.js. R3F v9 requires React 19; this app is React 18 and a
   framework-wide React upgrade is not a risk worth taking for one decorative
   canvas. The scene is a single InstancedMesh plus one additive sprite, so the
   imperative form is barely longer than the declarative one — and `lattice.ts`
   (all the actual geometry and morph maths) is byte-identical to the approved
   prototype. Visual behaviour is unchanged.
   ──────────────────────────────────────────────────────────────────────────── */

interface SceneProps {
  /** 0..1 scroll progress across the whole document. */
  progressRef: React.MutableRefObject<number>;
  /** Normalised pointer, -1..1 on both axes. */
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  /** One controlled interactive moment: 0..1 "charge" from the creative-tech section. */
  chargeRef: React.MutableRefObject<number>;
  reduced: boolean;
  mobile: boolean;
  /** Called if WebGL is unavailable or the context is lost, so the page can
      swap in the lightweight static field instead of showing nothing. */
  onFailure?: () => void;
}

/* The field is atmosphere, not decoration: mostly dim structure, a minority of
   cool nodes for depth, and accent used sparingly enough to still mean
   something. Saturating it evenly turns the lattice into confetti. */
const ACCENT = new THREE.Color("#FF6B3D");
const COOL = new THREE.Color("#3D5C9E");
const PALE = new THREE.Color("#8E9AB4");

/**
 * Framerate-independent damping. `1 - exp(-λ·dt)` converges at the same rate at
 * 30fps and 144fps; a bare `x += (target - x) * 0.06` does not, which is why
 * naive lerps feel different on different displays.
 */
const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** The warm radial sprite that is the composition's only light source. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,140,90,0.55)");
  grad.addColorStop(0.35, "rgba(120,90,220,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function LatticeScene({
  progressRef,
  pointerRef,
  chargeRef,
  reduced,
  mobile,
  onFailure,
}: SceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Props the animation loop reads every frame. Held in a ref so the effect can
  // stay mount-only (rebuilding the scene on a prop change would restart the
  // whole field mid-scroll).
  const liveProps = useRef({ reduced, mobile });
  liveProps.current = { reduced, mobile };

  const failRef = useRef(onFailure);
  failRef.current = onFailure;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const count = mobile ? NODE_COUNT_MOBILE : NODE_COUNT;
    const data: LatticeData = buildLattice(count);

    /* ── renderer ─────────────────────────────────────────────────────────── */
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !mobile,
        powerPreference: "high-performance",
        alpha: true,
      });
    } catch {
      // No WebGL at all (old driver, blocklisted GPU, hardened browser).
      failRef.current?.();
      return;
    }

    const size = () => ({ w: wrap.clientWidth || 1, h: wrap.clientHeight || 1 });
    const { w, h } = size();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    wrap.appendChild(renderer.domElement);

    /* ── scene, camera, fog ───────────────────────────────────────────────── */
    const scene = new THREE.Scene();
    // Exponential fog in the page background colour. This is what gives the
    // field a horizon instead of a hard edge — depth for free, no extra draw
    // call and no post-processing pass.
    scene.fog = new THREE.FogExp2(0x07080b, 0.052);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0, 6.9);

    // Biases the field right of centre while the hero copy owns the left half.
    const rig = new THREE.Group();
    rig.position.set(2.5, 0, -0.6);
    scene.add(rig);

    /* ── glow ─────────────────────────────────────────────────────────────── */
    const tex = glowTexture();
    const glowMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const glowGeo = new THREE.PlaneGeometry(1, 1);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -3);
    glow.scale.setScalar(9);
    rig.add(glow);

    /* ── nodes ────────────────────────────────────────────────────────────── */
    // Enabling instance colours makes three declare `attribute vec3 color` and
    // multiply it into vColor. Only ShaderMaterial carries a [1,1,1] fallback
    // for a missing `color`, so on MeshBasicMaterial it binds to (0,0,0) and
    // every node renders black. A neutral unit attribute makes it a no-op.
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const verts = geometry.attributes.position.count;
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(verts * 3).fill(1), 3),
    );

    const nodeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(geometry, nodeMat, count);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Depth-graded brightness so the field recedes instead of sitting flat.
    const c = new THREE.Color();
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const s = data.seeds[i];
      c.copy(s > 0.94 ? ACCENT : s > 0.74 ? COOL : PALE);
      c.multiplyScalar(0.45 + s * 0.55);
      c.toArray(colours, i * 3);
    }
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colours, 3);
    rig.add(mesh);

    const dummy = new THREE.Object3D();
    // Live positions, lerped toward the morph target each frame for inertia.
    const live = new Float32Array(data.states.core);

    /* ── wake gating ──────────────────────────────────────────────────────── */
    let onscreen = true;
    let shown = document.visibilityState === "visible";
    let awake = true;
    const sync = () => { awake = onscreen && shown; };

    const io = new IntersectionObserver(
      ([e]) => { onscreen = e.isIntersecting; sync(); },
      { rootMargin: "120px" },
    );
    io.observe(wrap);

    const onVis = () => { shown = document.visibilityState === "visible"; sync(); };
    document.addEventListener("visibilitychange", onVis);

    /* ── frame ────────────────────────────────────────────────────────────── */
    /** Dolly distance per narrative beat, keyed to scroll progress. */
    const dollyAt = (p: number) => {
      if (p < 0.22) return THREE.MathUtils.lerp(6.9, 7.6, p / 0.22); // core → capabilities
      if (p < 0.52) return THREE.MathUtils.lerp(7.6, 9.4, (p - 0.22) / 0.3); // pull back for the work
      if (p < 0.78) return THREE.MathUtils.lerp(9.4, 7.8, (p - 0.52) / 0.26); // return for process
      return THREE.MathUtils.lerp(7.8, 6.5, (p - 0.78) / 0.22); // close in on the CTA
    };

    const clock = new THREE.Clock();

    const step = (delta: number) => {
      const { reduced: red } = liveProps.current;
      const d = Math.min(delta, 0.05); // clamp after tab-switch stalls
      const p = progressRef.current;
      const { from, to, t, raw } = resolveMorph(p);
      const a = data.states[from];
      const b = data.states[to];
      const charge = chargeRef.current;
      const time = red ? 0 : clock.elapsedTime;

      // Dispersion: nodes bulge outward at the midpoint of every transition, so
      // a change of state reads as the form re-organising rather than sliding.
      const disperse = red ? 0 : Math.sin(Math.PI * raw) * 0.11;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const seed = data.seeds[i];

        // Morph target with a per-node stagger so the form reorganises in waves.
        const stagger = THREE.MathUtils.clamp((t - seed * 0.22) / 0.78, 0, 1);
        let tx = a[i3] + (b[i3] - a[i3]) * stagger;
        let ty = a[i3 + 1] + (b[i3 + 1] - a[i3 + 1]) * stagger;
        let tz = a[i3 + 2] + (b[i3 + 2] - a[i3 + 2]) * stagger;

        if (!red) {
          // Push outward from the origin at the midpoint of the transition.
          const bulge = 1 + disperse * (0.5 + seed);
          tx *= bulge;
          ty *= bulge;
          tz *= bulge;

          // Breathing drift — transform-only, cheap, gives the field life.
          const wv = time * 0.35 + seed * 6.28;
          tx += Math.sin(wv) * 0.045;
          ty += Math.cos(wv * 1.3) * 0.045;
          // The one interactive moment: charge pushes nodes outward + upward.
          if (charge > 0.001) {
            const burst = charge * (0.5 + seed);
            tx *= 1 + burst * 0.25;
            ty += burst * 0.35;
          }
        }

        // Inertia toward target.
        const k = red ? 1 : 1 - Math.pow(0.0016, d);
        live[i3] += (tx - live[i3]) * k;
        live[i3 + 1] += (ty - live[i3 + 1]) * k;
        live[i3 + 2] += (tz - live[i3 + 2]) * k;

        dummy.position.set(live[i3], live[i3 + 1], live[i3 + 2]);
        const s = (0.014 + seed * 0.026) * (1 + charge * 0.5);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      // Slow enough to read as drift rather than a turntable spin.
      if (!red) mesh.rotation.y += d * 0.022;

      // Withdraw behind the work and services copy — see fieldPresence().
      const presence = fieldPresence(p);
      const target = 0.85 * presence;
      nodeMat.opacity = red ? target : damp(nodeMat.opacity, target, 2.4, d);

      if (!red) {
        // Same envelope as the nodes, so light and matter withdraw together.
        glowMat.opacity = damp(glowMat.opacity, presence, 2.4, d);
        // Breathing, ±5% — never a pulse.
        glow.scale.setScalar((9 + Math.sin(clock.elapsedTime * 0.4) * 0.45) * (0.85 + presence * 0.15));
      } else {
        glowMat.opacity = presence;
      }

      // Camera. Owns every camera mutation so nothing fights over it.
      const bias = 2.5 * (1 - THREE.MathUtils.smoothstep(p, 0.06, 0.24));
      rig.position.x = red ? bias : damp(rig.position.x, bias, 3.2, d);

      if (!red) {
        // Pointer nudges, never disorients. Deliberately slower than the dolly
        // so the camera always reads as operated rather than cursor-attached.
        const { mobile: mob } = liveProps.current;
        camera.position.x = damp(camera.position.x, pointerRef.current.x * (mob ? 0.25 : 0.8), 2.1, d);
        camera.position.y = damp(camera.position.y, pointerRef.current.y * (mob ? 0.15 : 0.45), 2.1, d);
        camera.position.z = damp(camera.position.z, dollyAt(p), 2.6, d);
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      if (!awake) return; // gated: offscreen or backgrounded — no simulation, no draw
      step(delta);
    };

    if (reduced) {
      // Reduced motion: compose the field once and leave it still. No RAF loop,
      // no drift, no scroll-driven camera — matches the prototype's "demand"
      // frameloop.
      step(0);
    } else {
      clock.start();
      raf = requestAnimationFrame(loop);
    }

    /* ── resize ───────────────────────────────────────────────────────────── */
    const onResize = () => {
      const { w: nw, h: nh } = size();
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, liveProps.current.mobile ? 1.5 : 2));
      renderer.setSize(nw, nh, false);
      if (liveProps.current.reduced) step(0); // static field still needs a repaint
    };
    window.addEventListener("resize", onResize);

    /* ── context loss ─────────────────────────────────────────────────────── */
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      failRef.current?.();
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    /* ── teardown ─────────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      geometry.dispose();
      glowGeo.dispose();
      nodeMat.dispose();
      glowMat.dispose();
      tex.dispose();
      mesh.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) wrap.removeChild(renderer.domElement);
    };
    // Mount-only: `reduced`/`mobile` changes are read through liveProps, and a
    // genuine device-class change remounts via the `key` on the call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={wrapRef} className="imm-canvas-layer" aria-hidden="true" />;
}
