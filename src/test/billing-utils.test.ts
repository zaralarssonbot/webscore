import { describe, it, expect } from "vitest";
import { retentionSince, formatPrice, planRankDelta, isOverLimit } from "@/lib/billing/billing-utils";
import { PLANS, planById, PLAN_RANK } from "@/lib/billing/plans";

const NOW = Date.UTC(2026, 6, 14, 0, 0, 0);

describe("retentionSince", () => {
  it("is null for unlimited (null/undefined)", () => {
    expect(retentionSince(null)).toBeNull();
    expect(retentionSince(undefined)).toBeNull();
  });
  it("computes an ISO cutoff N days back", () => {
    expect(retentionSince(30, NOW)).toBe(new Date(NOW - 30 * 86_400_000).toISOString());
    expect(retentionSince(365, NOW)).toBe(new Date(NOW - 365 * 86_400_000).toISOString());
  });
});

describe("formatPrice", () => {
  it("shows free, monthly, annual-per-month, and custom", () => {
    expect(formatPrice(planById("free"), "month").big).toBe("0 kr");
    expect(formatPrice(planById("pro"), "month").big).toBe("249 kr");
    expect(formatPrice(planById("pro"), "year").big).toBe(`${Math.round(2490 / 12)} kr`);
    expect(formatPrice(planById("enterprise"), "month").big).toBe("Offert");
  });
});

describe("planRankDelta", () => {
  it("is positive for upgrade, negative for downgrade, zero for same", () => {
    expect(planRankDelta("free", "pro")).toBeGreaterThan(0);
    expect(planRankDelta("business", "free")).toBeLessThan(0);
    expect(planRankDelta("pro", "pro")).toBe(0);
  });
});

describe("isOverLimit", () => {
  it("never over when unlimited", () => {
    expect(isOverLimit(9999, null)).toBe(false);
  });
  it("over at or above the cap", () => {
    expect(isOverLimit(5, 5)).toBe(true);
    expect(isOverLimit(4, 5)).toBe(false);
  });
});

describe("plans config", () => {
  it("has four ranked tiers with Free = 3 domains", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "pro", "business", "enterprise"]);
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.enterprise);
    expect(planById("free").features.some((f) => /3 domäner/.test(f))).toBe(true);
  });
});
