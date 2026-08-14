import * as THREE from "three";
import { MEDIA_ASPECT, type MediaState } from "./media";
import { applyGrade, makeGradeUniforms } from "./grade";

/* ────────────────────────────────────────────────────────────────────────────
   THE BACKDROP — the drone chain, drawn as a texture inside one canvas.

   Ported from the approved prototype's @react-three/fiber implementation to
   imperative three.js, for the same reason `LatticeScene` was: R3F v9 needs
   React 19 and this app is React 18. The prototype's Backdrop used only
   `useFrame`, `useThree`, `<mesh>`, `<planeGeometry>` and `<meshBasicMaterial>`,
   so nothing declarative is lost. The per-frame maths below is the same
   arithmetic in the same order, and `grade.ts` carries the approved grade
   unchanged except for the hand-over colour, which is by definition the page's
   and not the film's — see the note on `makeGradeUniforms`.

   One simplification, and it is exact rather than approximate. The prototype
   put four quads a fixed distance in front of a 50° perspective camera and
   rescaled them every frame to refill the frustum. Nothing else was ever in that
   scene — no geometry, no lights, no camera travel — so the perspective divide
   was doing no work: a flat, unlit, camera-facing quad that exactly fills the
   frustum is the same set of pixels under an orthographic camera spanning
   -1..1. The camera-tracking maths (position, quaternion, DIST) therefore goes
   away and the cover-scale stays, which is the only part that was ever visible.

   Why a texture and not a DOM <video>: measured on the prototype, a
   full-viewport `<video>` cost ~11 fps as a second compositor layer while the
   page re-composited on every scroll frame. Shrinking that layer to 2×2 px
   restored 60 fps with decoding untouched, so the cost was the layer, not the
   decode.
   ──────────────────────────────────────────────────────────────────────────── */

export interface BackdropOptions {
  /** Element the canvas is appended to; sized from it. */
  wrap: HTMLElement;
  /** The single decode source. Deliberately never in the document. */
  video: HTMLVideoElement;
  /** Canvas holding the frozen outgoing frame across a clip swap. */
  freeze: HTMLCanvasElement;
  /** Still the one blended seam (B→C) mixes toward. */
  blendStill?: string;
  /** WebGL unavailable or context lost — the page swaps in the still. */
  onFailure?: () => void;
}

export interface Backdrop {
  /** Draw one frame from the live media state. */
  frame(state: MediaState): void;
  resize(): void;
  dispose(): void;
}

/**
 * Ceiling on the renderer's pixel ratio.
 *
 * The canvas has exactly one thing in it: the chain, drawn as a texture. So the
 * drawing buffer is not "display resolution" in any useful sense — it is the
 * size the 2560×1440 delivery encode gets magnified to. At DPR 2 that ran a
 * 1512×945 window up to 3024×1890 and asked the master to cover it: measured
 * magnification ×1.75, which is 0.33 source pixels per device pixel. The extra
 * buffer was not carrying detail, because there was no detail to carry.
 *
 * 1.4 is a cap, not a scale factor: a DPR-1 display still renders at 1.
 */
const DPR_CAP = 1.4;

/** The readability scrim: a darkening veil with no picture, deliberately ungraded. */
function scrimTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const rad = g.createRadialGradient(128, 118, 8, 128, 118, 150);
  rad.addColorStop(0, "rgba(6,7,11,0.84)");
  rad.addColorStop(0.62, "rgba(6,7,11,0.40)");
  rad.addColorStop(1, "rgba(6,7,11,0.12)");
  g.fillStyle = rad; g.fillRect(0, 0, 256, 256);
  const lin = g.createLinearGradient(0, 0, 0, 256);
  lin.addColorStop(0, "rgba(6,7,11,0.42)");
  lin.addColorStop(0.26, "rgba(6,7,11,0)");
  lin.addColorStop(0.74, "rgba(6,7,11,0)");
  lin.addColorStop(1, "rgba(6,7,11,0.5)");
  g.fillStyle = lin; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function quad(map: THREE.Texture, renderOrder: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const mat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

export function createBackdrop(opts: BackdropOptions): Backdrop | null {
  const { wrap, video, freeze, blendStill, onFailure } = opts;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
  } catch {
    onFailure?.();
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP));
  wrap.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

  const scene = new THREE.Scene();
  // Spans -1..1 on both axes, so a 2×2 plane at scale 1 exactly fills it.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  camera.position.z = 1;

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;

  const freezeTexture = new THREE.CanvasTexture(freeze);
  freezeTexture.colorSpace = THREE.SRGBColorSpace;
  freezeTexture.minFilter = THREE.LinearFilter;
  freezeTexture.generateMipmaps = false;

  let blendTexture: THREE.Texture | null = null;
  if (blendStill) {
    blendTexture = new THREE.TextureLoader().load(blendStill);
    blendTexture.colorSpace = THREE.SRGBColorSpace;
    blendTexture.minFilter = THREE.LinearFilter;
    blendTexture.generateMipmaps = false;
  }

  const scrimTex = scrimTexture();

  // renderOrder keeps these in order; depthTest off makes them a true backdrop.
  // The blend still sits BEHIND the video, which is faded to (1 − blend) on top
  // of it — that composites to a straight mix without decoding two clips at once.
  const blendMesh = blendTexture ? quad(blendTexture, -21) : null;
  const freezeMesh = quad(freezeTexture, -20);
  const videoMesh = quad(videoTexture, -19);
  const scrimMesh = quad(scrimTex, -18);
  const meshes = [blendMesh, freezeMesh, videoMesh, scrimMesh].filter(Boolean) as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >[];
  meshes.forEach((m) => scene.add(m));

  // One uniform set for every quad, so a seam can never grade differently on
  // each side. The scrim is left ungraded on purpose — it carries no picture.
  // The hand-over colour is read from the page rather than hard-coded, so the
  // film cannot end on a colour the page is not.
  // Read from `--portal-landing`, not from `--void`. The rule is that the film's
  // last frame and the page's first frame must be the same colour, and the page
  // that follows is no longer the dark homepage — it is the bright world, whose
  // ground is #F1F4F8. That is also the colour clip E was graded to land on in
  // the first place, so this returns the hand-over to its measured value.
  const pageColour =
    getComputedStyle(wrap).getPropertyValue("--portal-landing").trim() || "#F1F4F8";
  const grade = makeGradeUniforms(pageColour);
  for (const m of [videoMesh, freezeMesh, blendMesh]) {
    if (m) applyGrade(m.material, grade);
  }

  /**
   * Build the shader programs now instead of on first sight.
   *
   * Measured on the prototype across four cold loads, the first frame that
   * rendered the graded material cost 32.7, 17.6, 82.8 and 17.6 ms — a stall on
   * half of them, landing exactly when the visitor starts to scroll. Compiling
   * here moves it to a moment when nothing is moving yet. The quads are flipped
   * visible for the traversal only: `compile` walks the visible graph to find
   * materials and does not draw, so nothing reaches the screen.
   */
  {
    const was = meshes.map((m) => m.visible);
    meshes.forEach((m) => { m.visible = true; });
    const restore = () => meshes.forEach((m, i) => { m.visible = was[i]; });
    const r = renderer as THREE.WebGLRenderer & {
      compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<unknown>;
    };
    if (typeof r.compileAsync === "function") r.compileAsync(scene, camera).then(restore, restore);
    else { renderer.compile(scene, camera); restore(); }
  }

  const onLost = (e: Event) => { e.preventDefault(); onFailure?.(); };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  const resize = () => {
    const w = wrap.clientWidth || 1;
    const h = wrap.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP));
    renderer.setSize(w, h, false);
    // Over-scale on the short axis so the media covers rather than letterboxes —
    // the WebGL equivalent of object-fit: cover.
    const frameAspect = w / h;
    const scaleX = MEDIA_ASPECT > frameAspect ? MEDIA_ASPECT / frameAspect : 1;
    const scaleY = MEDIA_ASPECT > frameAspect ? 1 : frameAspect / MEDIA_ASPECT;
    meshes.forEach((m) => m.scale.set(scaleX, scaleY, 1));
  };
  resize();

  return {
    frame(s: MediaState) {
      grade.uFlatten.value = s.flatten;
      const blend = s.blendOpacity;
      videoMesh.material.opacity = s.videoOpacity * (1 - blend);
      freezeMesh.material.opacity = s.freezeOpacity;
      videoMesh.visible = videoMesh.material.opacity > 0.002;
      freezeMesh.visible = s.freezeOpacity > 0.002;
      if (blendMesh) {
        blendMesh.material.opacity = blend;
        blendMesh.visible = blend > 0.002;
      }
      scrimMesh.material.opacity = s.scrimOpacity;
      scrimMesh.visible = scrimMesh.material.opacity > 0.002;

      if (!videoMesh.visible && !freezeMesh.visible && !scrimMesh.visible && !(blendMesh && blendMesh.visible)) {
        return;
      }

      if (s.sourceChanged) {
        freezeTexture.needsUpdate = true;
        s.sourceChanged = false;
      }

      // A playing video invalidates its own texture; a scrubbed one does not, so
      // the seek has to be pushed by hand. Gated on readyState because forcing an
      // upload from an element with no frame yet logs
      // "WebGL: INVALID_VALUE: texImage2D: no video" on every frame until it loads.
      if (s.scrubbing && videoMesh.visible && video.readyState >= 2) {
        videoTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
    },
    resize,
    dispose() {
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      videoTexture.dispose();
      freezeTexture.dispose();
      scrimTex.dispose();
      blendTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
