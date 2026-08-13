import * as THREE from "three";

/**
 * THE GRADE
 *
 * Cool shadows, warm highlights. Not "make the film blue".
 *
 * The palette was pipetted out of the reference images rather than chosen, and
 * the measurement is the reason this grade is shaped the way it is: blue exists
 * in that world only in the sky (`#8DB1CE`, blue-bias +65) and in dark glass
 * (`#333641`, +14). Everything built is warm — brick in shade −22, soffits −59.
 * Measured across clip D the footage sits between −38 and −44, warm all the way
 * through. So the grade moves the shadows and leaves the sun alone.
 *
 * Applied by patching the existing MeshBasicMaterial rather than replacing it
 * with a ShaderMaterial: opacity, transparency and depth handling all keep
 * working exactly as measured, and the injection is one chunk.
 *
 * The shader must never be used to enlarge the screen or hide the room. When the
 * journey reaches the monitor, the camera has to have physically travelled there
 * — bezel, desk, lamp and walls outside the viewport because they are behind the
 * lens, not because a shader pushed them away. The only thing this file may do at
 * the very end is match the white it is already showing to #F1F4F8.
 */

export interface GradeUniforms {
  uShadowTint: { value: THREE.Color };
  uShadowAmt: { value: number };
  uShadowEnd: { value: number };
  uHighTint: { value: THREE.Color };
  uHighAmt: { value: number };
  uHighStart: { value: number };
  uSaturation: { value: number };
  uGlowRadius: { value: number };
  uGlowThreshold: { value: number };
  uGlowStrength: { value: number };
  /** 0..1 toward a flat #F1F4F8. Only ever non-zero once the frame is already
   *  uniform white — it removes the lens vignette, it does not hide anything. */
  uFlatten: { value: number };
  uFlatTarget: { value: THREE.Color };
}

/**
 * One set shared by every backdrop quad, so the seams cannot grade differently.
 *
 * `flatTarget` is the only value that differs from the approved prototype, and
 * it differs because the rule it encodes is "the last frames of the film and the
 * first frames of the page have to be the same colour, or the swap is visible."
 * The prototype handed over to a light editorial half and used its paper,
 * #F1F4F8. This homepage is near-black throughout, so matching it means the
 * page's own `--void`. Passing the wrong one does not soften the seam, it
 * inverts it: the film ended on white with #07080b underneath.
 */
export function makeGradeUniforms(flatTarget = "#07080b"): GradeUniforms {
  return {
    // Hue 207°, the same family as the sky and the glazing it has to agree with.
    uShadowTint: { value: new THREE.Color("#2E4A6B") },
    uShadowAmt: { value: 0.16 },
    uShadowEnd: { value: 0.45 },
    // Golden hour is the subject, not a problem to be graded away.
    uHighTint: { value: new THREE.Color("#FFF0DC") },
    uHighAmt: { value: 0.10 },
    uHighStart: { value: 0.62 },
    // Slightly held back reads as premium; fully saturated reads as stock.
    uSaturation: { value: 0.94 },
    // Screen glow. The radius is in UV, so 0.010 is ~19 px across a 1920-wide
    // frame — enough for the panel to bleed into the room without the eight taps
    // reading as a ring. The threshold keeps brick, floor and wall out of it:
    // only the monitor and the sun clear 0.86.
    uGlowRadius: { value: 0.010 },
    uGlowThreshold: { value: 0.86 },
    uGlowStrength: { value: 0.85 },
    uFlatten: { value: 0.0 },
    // The page's own colour — see the note on the signature.
    uFlatTarget: { value: new THREE.Color(flatTarget) },
  };
}

const HEAD = /* glsl */ `
uniform vec3 uShadowTint; uniform float uShadowAmt; uniform float uShadowEnd;
uniform vec3 uHighTint;   uniform float uHighAmt;   uniform float uHighStart;
uniform float uSaturation;
uniform float uGlowRadius; uniform float uGlowThreshold; uniform float uGlowStrength;
uniform float uFlatten; uniform vec3 uFlatTarget;
`;

/**
 * Eight taps in the pass that is already running, instead of a bloom pass.
 *
 * A real bloom means a 2880×1800 render target at DPR 2, highlight extraction,
 * two blur passes and a composite — several full-screen passes on a budget that
 * measured p95 16.8–17.3 ms against 16.7. There is no room. And the only thing
 * that has to glow is the white screen: large, bright and low-frequency, which
 * is exactly what a sparse tap ring handles well. The threshold keeps brick and
 * floor out of it.
 */
const BODY = /* glsl */ `
#include <map_fragment>
{
  vec3 c = diffuseColor.rgb;

  if (uGlowStrength > 0.0) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398163;             // 2π / 8
      vec2 o = vec2(cos(a), sin(a)) * uGlowRadius;
      vec3 s = texture2D(map, vMapUv + o).rgb;
      g += max(s - vec3(uGlowThreshold), vec3(0.0));
    }
    c += g * (uGlowStrength * 0.125);
  }

  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Additive, not multiplicative: multiplying a shadow darkens the very thing
  // being tinted, and these are already the darkest pixels in the frame.
  float sw = 1.0 - smoothstep(0.0, uShadowEnd, L);
  c += uShadowTint * sw * uShadowAmt;
  float hw = smoothstep(uHighStart, 1.0, L);
  c = mix(c, c * uHighTint, hw * uHighAmt);
  c = mix(vec3(L), c, uSaturation);

  // Last, and only at the very end of the journey: flatten the natural vignette
  // onto the page's own colour. Measured on clip E's final frame the field runs
  // 242 at centre to 231 at the corners — uniform white to the eye, but an 11
  // level gradient that would pop against a flat DOM background at the hand-over.
  c = mix(c, uFlatTarget, uFlatten);

  diffuseColor.rgb = c;
}
`;

/** Patch a backdrop material so it carries the grade. */
export function applyGrade(mat: THREE.Material, u: GradeUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = HEAD + shader.fragmentShader.replace("#include <map_fragment>", BODY);
  };
  mat.needsUpdate = true;
}
