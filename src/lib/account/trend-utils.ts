// Pure, unit-tested helpers for trend analytics. No I/O — safe to test directly.

export interface TrendPoint {
  ts: string;               // ISO timestamp (measured_at ?? created_at)
  score: number;            // overall final_score
  categories: Record<string, number>;
}

export type RangeKey = "30d" | "90d" | "6m" | "12m" | "all";

export const RANGE_DAYS: Record<RangeKey, number | null> = {
  "30d": 30,
  "90d": 90,
  "6m": 182,
  "12m": 365,
  all: null,
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  "30d": "30 dagar",
  "90d": "90 dagar",
  "6m": "6 mån",
  "12m": "12 mån",
  all: "Allt",
};

/** ISO cutoff for a range, or null for "all". Pure (nowMs injected). */
export function rangeSince(range: RangeKey, nowMs: number): string | null {
  const days = RANGE_DAYS[range];
  if (days == null) return null;
  return new Date(nowMs - days * 86_400_000).toISOString();
}

/** First→last delta of the overall score across the points (chronological). */
export function deltaOverRange(points: TrendPoint[]): number | null {
  if (points.length < 2) return null;
  return points[points.length - 1].score - points[0].score;
}

/**
 * Largest-Triangle-Three-Buckets downsample to at most `max` points, preserving
 * visual shape and always keeping the first and last point. Returns the input
 * unchanged when it already fits.
 */
export function downsample(points: TrendPoint[], max: number): TrendPoint[] {
  if (max < 3 || points.length <= max) return points;
  const sampled: TrendPoint[] = [points[0]];
  const bucketSize = (points.length - 2) / (max - 2);
  let a = 0;
  for (let i = 0; i < max - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
    // Average point of the next bucket.
    let avgX = 0;
    let avgY = 0;
    const nextStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
    const nextCount = Math.max(1, nextEnd - nextStart);
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += new Date(points[j]?.ts ?? points[points.length - 1].ts).getTime();
      avgY += points[j]?.score ?? 0;
    }
    avgX /= nextCount;
    avgY /= nextCount;
    // Point in the current bucket with the largest triangle area vs a & avg.
    const aX = new Date(points[a].ts).getTime();
    const aY = points[a].score;
    let maxArea = -1;
    let chosen = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      const pX = new Date(points[j].ts).getTime();
      const pY = points[j].score;
      const area = Math.abs((aX - avgX) * (pY - aY) - (aX - pX) * (avgY - aY)) / 2;
      if (area > maxArea) {
        maxArea = area;
        chosen = j;
      }
    }
    sampled.push(points[chosen]);
    a = chosen;
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}
