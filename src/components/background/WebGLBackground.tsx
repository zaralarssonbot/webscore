import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/* ------------------------------------------------------------------ *
 * Shared GLSL — 3D simplex noise (Ashima Arts / Stefan Gustavson)    *
 * + fbm. Drives the organic, slow-flowing aurora.                    *
 * ------------------------------------------------------------------ */
const NOISE_GLSL = /* glsl */ `
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
`;

/* ------------------------------------------------------------------ *
 * Aurora — base layer, rendered to a HALF-RESOLUTION target.         *
 * Multi-layered, domain-warped fbm flow. Deep-dark base, neon ramp,  *
 * with a soft faux-bloom baked in. Smooth gradients upscale cleanly, *
 * so half-res cuts the expensive noise fragments ~4× (perf is holy). *
 * Film grain is applied later at full res in the composite pass.     *
 * ------------------------------------------------------------------ */
const auroraVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const auroraFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uParallax;   // smoothed pointer, -1..1
uniform float uScroll;     // smoothed scroll progress, ~0..1+
${NOISE_GLSL}

// Palette
const vec3 BASE   = vec3(0.038, 0.044, 0.062); // ~#0B0D12 — matches CSS --background
const vec3 TEAL   = vec3(0.176, 0.886, 0.784); // #2DE2C8
const vec3 BLUE   = vec3(0.212, 0.627, 0.941); // #36A0F0
const vec3 PURPLE = vec3(0.545, 0.361, 0.965); // #8B5CF6

void main(){
  vec2 uv = vUv;
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // Slow, calm time bases — no bouncing, just drift.
  float t = uTime * 0.03;

  // Gentle pointer/scroll-driven drift of the whole field (very subtle).
  vec2 drift = uParallax * 0.04 + vec2(0.0, uScroll * 0.10);
  // Low base frequency + vertical stretch → broad, calm aurora ribbons
  // rather than tight marble veining.
  vec3 q = vec3(p * vec2(0.85, 1.35) + drift, t);

  // Light domain warp for organic, liquid flow (kept gentle).
  float w1 = fbm(q + vec3(0.0, t * 0.5, 0.0));
  float flow = fbm(q * 1.5 + vec3(w1 * 0.6) + vec3(0.0, t * 0.4, 0.0));

  // A second, slower field to drive the colour mix (teal↔blue↔purple).
  float hue = fbm(q * 0.7 + vec3(w1 * 0.5) + vec3(t * 0.2, -t * 0.15, 0.0));
  hue = hue * 0.5 + 0.5; // 0..1

  // Aurora intensity — kept LOW so it never competes with text.
  float band = smoothstep(0.05, 0.95, flow * 0.5 + 0.5);
  band = pow(band, 1.35);

  // Colour ramp.
  vec3 col = mix(TEAL, BLUE, smoothstep(0.0, 0.6, hue));
  col = mix(col, PURPLE, smoothstep(0.45, 1.0, hue));

  // Compose over the deep base. Peak neon contribution stays restrained so
  // the aurora reads as contained glow, not a flood.
  float intensity = band * 0.34;

  // Faux-bloom: soft halo around the brightest cores (cheap, single draw).
  float core = smoothstep(0.62, 1.0, band);
  intensity += core * 0.16;

  vec3 color = BASE + col * intensity;

  // A faint cool wash in the deep areas so the base never reads flat-black.
  color += BLUE * 0.012 * (1.0 - band);

  // Radial vignette to pull focus toward the centre / content.
  float vig = smoothstep(1.15, 0.25, length(uv - 0.5) * 1.35);
  color *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(color, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Composite — full-res pass: upscales the half-res aurora target and *
 * adds hair-fine film grain so the grain stays crisp.                *
 * ------------------------------------------------------------------ */
const compositeVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const compositeFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uTime;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec3 color = texture2D(uTex, vUv).rgb;
  // Hair-fine film grain, computed at full resolution.
  float g = hash(vUv * uResolution + fract(uTime) * 100.0);
  color += (g - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Parallax grid — depth layer of soft dots that shift with the       *
 * pointer + scroll. Additive, very low opacity.                      *
 * ------------------------------------------------------------------ */
const gridVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const gridFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2  uResolution;
uniform vec2  uParallax;
uniform float uScroll;
uniform float uTime;

void main(){
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vUv;
  uv.x *= aspect;

  // Parallax offset — this layer sits "behind" and shifts more than content.
  vec2 off = uParallax * 0.06 + vec2(0.0, uScroll * 0.18);
  uv += off;

  // Dot grid.
  float scale = 26.0;
  vec2 g = fract(uv * scale) - 0.5;
  float d = length(g);
  float dot = smoothstep(0.10, 0.04, d);

  // Distance fade from centre so edges stay calm.
  vec2 c = vUv - 0.5; c.x *= aspect;
  float fade = smoothstep(0.85, 0.15, length(c));

  // Slow breathing shimmer.
  float shimmer = 0.7 + 0.3 * sin(uTime * 0.3 + vUv.y * 6.2831);

  vec3 tint = mix(vec3(0.176, 0.886, 0.784), vec3(0.212, 0.627, 0.941), vUv.y);
  float alpha = dot * fade * shimmer * 0.05;

  gl_FragColor = vec4(tint, alpha);
}
`;

/* ------------------------------------------------------------------ *
 * Particle data-stream — sparse points drifting slowly upward.       *
 * ------------------------------------------------------------------ */
const particleVert = /* glsl */ `
attribute float aSeed;
varying float vAlpha;
varying float vMix;
uniform float uTime;
uniform vec2  uParallax;
uniform float uScroll;
uniform float uPixelRatio;

void main(){
  vec2 pos = position.xy;

  // Drift upward; wrap around the top.
  float speed = 0.012 + aSeed * 0.02;
  pos.y = fract(pos.y + uTime * speed) ; // 0..1
  // Gentle horizontal sway.
  pos.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.01;

  // Parallax — particles react a touch to pointer + scroll.
  pos.xy += uParallax * 0.02 + vec2(0.0, uScroll * 0.05);

  // To clip space (-1..1).
  vec2 clip = pos * 2.0 - 1.0;
  gl_Position = vec4(clip, 0.0, 1.0);

  // Fade in/out across vertical travel + twinkle.
  float edge = smoothstep(0.0, 0.12, pos.y) * smoothstep(1.0, 0.85, pos.y);
  float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aSeed * 50.0);
  vAlpha = edge * twinkle;
  vMix = aSeed;

  gl_PointSize = (1.0 + aSeed * 1.6) * uPixelRatio;
}
`;

const particleFrag = /* glsl */ `
precision highp float;
varying float vAlpha;
varying float vMix;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float soft = smoothstep(0.5, 0.0, d);
  vec3 tint = mix(vec3(0.176, 0.886, 0.784), vec3(0.212, 0.627, 0.941), vMix);
  gl_FragColor = vec4(tint, soft * vAlpha * 0.5);
}
`;

const PARTICLE_COUNT = 70;

interface Props {
  /** When false, render a single static frame (prefers-reduced-motion). */
  animated?: boolean;
}

/**
 * Generative WebGL background — animated neon aurora (domain-warped fbm),
 * a parallax dot-grid depth layer, and a sparse rising particle stream.
 * Faux-bloom + film grain are baked into the aurora shader (single draw).
 *
 * Performance discipline:
 *  - devicePixelRatio capped at 1.5
 *  - render loop pauses when the tab is hidden
 *  - prefers-reduced-motion → one static frame, no RAF
 */
const WebGLBackground = ({ animated = true }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      return; // Let the parent fallback handle it.
    }

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(DPR);

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const resolution = new Vector2(1, 1); // full-res drawing buffer
    const auroraRes = new Vector2(1, 1); // half-res aurora target
    const parallax = new Vector2(0, 0); // smoothed pointer
    const parallaxTarget = new Vector2(0, 0);
    let scrollSmooth = 0;
    let scrollTarget = 0;

    // Half-resolution target for the (smooth, expensive) aurora.
    const auroraRT = new WebGLRenderTarget(1, 1, { depthBuffer: false });

    /* --- Aurora base (rendered into auroraRT) ---------------------- */
    const auroraScene = new Scene();
    const auroraMat = new ShaderMaterial({
      vertexShader: auroraVert,
      fragmentShader: auroraFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: auroraRes },
        uParallax: { value: parallax },
        uScroll: { value: 0 },
      },
    });
    const auroraMesh = new Mesh(new PlaneGeometry(2, 2), auroraMat);
    auroraMesh.frustumCulled = false;
    auroraScene.add(auroraMesh);

    /* --- Main scene: composite + grid + particles ------------------ */
    const scene = new Scene();

    // Composite — upscales the aurora target and adds full-res grain.
    const compositeMat = new ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTex: { value: auroraRT.texture },
        uResolution: { value: resolution },
        uTime: { value: 0 },
      },
    });
    const compositeMesh = new Mesh(new PlaneGeometry(2, 2), compositeMat);
    compositeMesh.frustumCulled = false;
    compositeMesh.renderOrder = 0;
    scene.add(compositeMesh);

    /* --- Parallax grid --------------------------------------------- */
    const gridMat = new ShaderMaterial({
      vertexShader: gridVert,
      fragmentShader: gridFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: resolution },
        uParallax: { value: parallax },
        uScroll: { value: 0 },
      },
    });
    const gridMesh = new Mesh(new PlaneGeometry(2, 2), gridMat);
    gridMesh.frustumCulled = false;
    gridMesh.renderOrder = 1;
    scene.add(gridMesh);

    /* --- Particle stream ------------------------------------------- */
    // Deterministic pseudo-random (no Math.random dependency for SSR/stability).
    const rand = (() => {
      let s = 1337;
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
    })();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = rand(); // x 0..1
      positions[i * 3 + 1] = rand(); // y 0..1
      positions[i * 3 + 2] = 0;
      seeds[i] = rand();
    }
    const particleGeo = new BufferGeometry();
    particleGeo.setAttribute("position", new BufferAttribute(positions, 3));
    particleGeo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const particleMat = new ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uParallax: { value: parallax },
        uScroll: { value: 0 },
        uPixelRatio: { value: DPR },
      },
    });
    const particles = new Points(particleGeo, particleMat);
    particles.frustumCulled = false;
    particles.renderOrder = 2;
    scene.add(particles);

    /* --- Sizing ----------------------------------------------------- */
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      const buf = renderer.getDrawingBufferSize(new Vector2());
      resolution.set(buf.x, buf.y);
      // Aurora at half res (min 1px); smooth gradients upscale cleanly.
      const aw = Math.max(1, Math.round(buf.x * 0.5));
      const ah = Math.max(1, Math.round(buf.y * 0.5));
      auroraRT.setSize(aw, ah);
      auroraRes.set(aw, ah);
    };
    resize();

    /* --- Pointer + scroll ------------------------------------------ */
    const onPointer = (e: PointerEvent) => {
      parallaxTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollTarget = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* --- Render loop ------------------------------------------------ */
    // Manually accumulated time + clamped delta — survives tab-pause and
    // background throttling with no visible time jump on resume.
    const clock = new Clock();
    let elapsed = 0;
    let raf = 0;
    let running = true;

    const renderFrame = () => {
      // Smooth pointer + scroll toward targets.
      parallax.lerp(parallaxTarget, 0.04);
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.06;

      auroraMat.uniforms.uTime.value = elapsed;
      auroraMat.uniforms.uScroll.value = scrollSmooth;
      compositeMat.uniforms.uTime.value = elapsed;
      gridMat.uniforms.uTime.value = elapsed;
      gridMat.uniforms.uScroll.value = scrollSmooth;
      particleMat.uniforms.uTime.value = elapsed;
      particleMat.uniforms.uScroll.value = scrollSmooth;

      // Pass 1: aurora → half-res target. Pass 2: composite + grid + particles → screen.
      renderer.setRenderTarget(auroraRT);
      renderer.render(auroraScene, camera);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      elapsed += Math.min(clock.getDelta(), 0.05); // clamp to avoid jumps
      renderFrame();
      raf = requestAnimationFrame(loop);
    };

    if (animated) {
      loop();
    } else {
      // Static single frame for reduced-motion.
      elapsed = 8.0;
      renderFrame();
    }

    /* --- Pause when tab hidden ------------------------------------- */
    const onVisibility = () => {
      if (!animated) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta(); // discard the long hidden gap
        loop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    /* --- Teardown --------------------------------------------------- */
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      auroraMesh.geometry.dispose();
      auroraMat.dispose();
      compositeMesh.geometry.dispose();
      compositeMat.dispose();
      gridMesh.geometry.dispose();
      gridMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      auroraRT.dispose();
      renderer.dispose();
    };
  }, [animated]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
};

export default WebGLBackground;
