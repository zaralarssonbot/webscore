import { describe, it, expect } from "vitest";
import { rangeSince, deltaOverRange, downsample, RANGE_DAYS, type TrendPoint } from "@/lib/account/trend-utils";

const NOW = Date.UTC(2026, 6, 13, 0, 0, 0); // fixed, injected — no Date.now()

function pt(dayOffset: number, score: number): TrendPoint {
  return { ts: new Date(NOW + dayOffset * 86_400_000).toISOString(), score, categories: { seo: score } };
}

describe("rangeSince", () => {
  it("returns null for the all-time range", () => {
    expect(rangeSince("all", NOW)).toBeNull();
  });
  it("computes the correct cutoff for bounded ranges", () => {
    for (const range of ["30d", "90d", "6m", "12m"] as const) {
      const days = RANGE_DAYS[range] as number;
      expect(rangeSince(range, NOW)).toBe(new Date(NOW - days * 86_400_000).toISOString());
    }
  });
});

describe("deltaOverRange", () => {
  it("is null with fewer than two points", () => {
    expect(deltaOverRange([])).toBeNull();
    expect(deltaOverRange([pt(0, 50)])).toBeNull();
  });
  it("is last minus first (chronological)", () => {
    expect(deltaOverRange([pt(-10, 40), pt(-5, 55), pt(0, 62)])).toBe(22);
    expect(deltaOverRange([pt(-10, 80), pt(0, 65)])).toBe(-15);
  });
});

describe("downsample", () => {
  it("returns the input unchanged when it already fits", () => {
    const pts = [pt(0, 10), pt(1, 20), pt(2, 30)];
    expect(downsample(pts, 5)).toBe(pts);
  });
  it("caps to max and preserves first + last", () => {
    const pts = Array.from({ length: 100 }, (_, i) => pt(i, i));
    const out = downsample(pts, 20);
    expect(out.length).toBe(20);
    expect(out[0]).toBe(pts[0]);
    expect(out[out.length - 1]).toBe(pts[pts.length - 1]);
  });
  it("keeps points in chronological order", () => {
    const pts = Array.from({ length: 60 }, (_, i) => pt(i, (i * 7) % 100));
    const out = downsample(pts, 15);
    const times = out.map((p) => new Date(p.ts).getTime());
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
  });
});
