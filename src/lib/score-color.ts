/**
 * Semantic score/priority colour system — the single source of truth for how a
 * value maps to meaning across the results (score rings, category cards,
 * comparison bars, status badges, priority/recommendation accents).
 *
 * Five tiers, restrained and dark-first — colour communicates priority, never
 * decoration:
 *   90–100  Excellent      green
 *   80–89   Good           cyan  (the brand accent)
 *   70–79   Needs attention yellow
 *   50–69   High priority  orange
 *   0–49    Critical       red
 *
 * The primary CTA gradient (cyan → purple) is intentionally NOT part of this
 * system — it is reserved for the main conversion actions only.
 */

export type ScoreTier = "excellent" | "good" | "attention" | "high" | "critical";

export interface TierColor {
  tier: ScoreTier;
  /** Swedish tier label (matches the product's language). */
  label: string;
  h: number;
  s: number;
  l: number;
  /** Solid colour, e.g. text / ring stroke. */
  hsl: string;
  /** Glow colour (0.45 alpha) — used by existing box/text-shadow helpers. */
  glow: string;
  /** Faint fill for tinted surfaces. */
  bg: string;
  /** Hairline border tint. */
  border: string;
}

const TIERS: Record<ScoreTier, { h: number; s: number; l: number; label: string }> = {
  excellent: { h: 150, s: 72, l: 46, label: "Utmärkt" },
  good: { h: 190, s: 90, l: 55, label: "Bra" },
  attention: { h: 45, s: 95, l: 55, label: "Ses över" },
  high: { h: 28, s: 95, l: 56, label: "Hög prioritet" },
  critical: { h: 0, s: 78, l: 60, label: "Kritisk" },
};

const build = (tier: ScoreTier): TierColor => {
  const { h, s, l, label } = TIERS[tier];
  return {
    tier,
    label,
    h,
    s,
    l,
    hsl: `hsl(${h} ${s}% ${l}%)`,
    glow: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
    bg: `hsla(${h}, ${s}%, ${l}%, 0.08)`,
    border: `hsla(${h}, ${s}%, ${l}%, 0.18)`,
  };
};

/** Tier for a 0–100 score. */
export const tierForScore = (score: number): ScoreTier => {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "attention";
  if (score >= 50) return "high";
  return "critical";
};

/** Full colour set for a 0–100 score. */
export const scoreColor = (score: number): TierColor => build(tierForScore(score));

/** Full colour set for a named tier (e.g. a recommendation's priority accent). */
export const tierColor = (tier: ScoreTier): TierColor => build(tier);

/** Build an arbitrary-alpha hsla from a tier colour (for tinted fills/borders). */
export const alpha = (c: TierColor, a: number) => `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;
