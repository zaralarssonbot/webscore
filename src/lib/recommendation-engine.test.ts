import { describe, it, expect } from "vitest";
import { prioritize, planRoadmap, type TimeBucket } from "./recommendation-engine";
import type { ScanResult, AuditCheck, CategoryScores } from "./scan-service";

const TIME_BUCKETS: TimeBucket[] = ["5 min", "30 min", "2 timmar", "en halvdag"];

const check = (id: string, category: AuditCheck["category"], impact: AuditCheck["impact"], passed: boolean): AuditCheck => ({
  id,
  label: id,
  category,
  passed,
  detail: `${id} detail`,
  impact,
});

const scan = (auditChecks: AuditCheck[], scores?: Partial<CategoryScores>, extra: Partial<ScanResult> = {}): ScanResult => ({
  scanId: "s1",
  score: 50,
  summary: "",
  categoryScores: { seo: 50, conversion: 50, trust: 50, performance: 50, security: 50, ...scores },
  weaknesses: [],
  strengths: [],
  opportunity: "",
  auditChecks,
  ...extra,
});

describe("recommendation engine — prioritises like a consultant", () => {
  it("commits to exactly one lead and holds the rest back (never recommends everything)", () => {
    const plan = prioritize(scan([
      check("phone", "conversion", "high", false),
      check("meta_desc", "seo", "high", false),
      check("load_time", "performance", "high", false),
    ]))!;
    expect(plan.lead).toBeTruthy();
    expect(plan.held.length).toBe(2); // the other two are deferred, not recommended now
    expect(plan.held.map((h) => h.id)).not.toContain(plan.lead.id);
  });

  it("personalises to a lead-gen business: a high-impact conversion fix wins", () => {
    const plan = prioritize(scan([
      check("phone", "conversion", "high", false),
      check("meta_desc", "seo", "high", false),
      check("load_time", "performance", "high", false),
    ]))!;
    expect(plan.lead.id).toBe("phone"); // lead-gen + low effort → highest leverage
    expect(plan.lead.confidence).toBe("high"); // grounded in a deterministic check
    expect(plan.lead.effort).toBe("low");
  });

  it("prefers lower effort when impact is equal (leverage, not just impact)", () => {
    const plan = prioritize(scan([
      check("meta_desc", "seo", "high", false), // low effort
      check("load_time", "performance", "high", false), // high effort
    ]))!;
    expect(plan.lead.id).toBe("meta_desc");
    expect(plan.held[0].id).toBe("load_time");
    expect(plan.held[0].reason).toMatch(/grunden sitter/i); // deferred because it's a bigger job
  });

  it("ignores passing checks and only recommends what is actually failing on this site", () => {
    const plan = prioritize(scan([
      check("title", "seo", "high", true), // passing — must be ignored
      check("cta", "conversion", "high", false),
    ]))!;
    expect(plan.lead.id).toBe("cta");
    expect(plan.held.length).toBe(0); // only one real candidate
  });

  it("grounds the priority in scan facts: the category and its score, not an opinion", () => {
    const plan = prioritize(scan([
      check("phone", "conversion", "high", false),
      check("meta_desc", "seo", "high", false),
    ], { conversion: 41, seo: 70, trust: 80, performance: 80, security: 80 }))!;
    expect(plan.lead.id).toBe("phone");
    expect(plan.priorityReason).toContain("Konvertering"); // the lead's actual category
    expect(plan.priorityReason).toContain("41/100"); // the real category score from the scan
    expect(plan.priorityReason).toMatch(/svagaste/); // and it is in fact the weakest category
  });

  it("falls back to a growth recommendation when nothing is failing", () => {
    const plan = prioritize(scan(
      [check("title", "seo", "high", true)],
      {},
      { opportunity: "Bygg en återkommande nyhetsbrevsfunnel." },
    ))!;
    expect(plan.lead.id).toBe("growth");
    expect(plan.lead.decision).toContain("nyhetsbrevsfunnel");
    expect(plan.held.length).toBe(0);
  });
});

describe("implementation roadmap — a calm, phased execution plan", () => {
  const manyFailing = () =>
    scan([
      check("phone", "conversion", "high", false),
      check("cta", "conversion", "high", false),
      check("forms", "conversion", "high", false),
      check("meta_desc", "seo", "high", false),
      check("title", "seo", "high", false),
      check("testimonials", "trust", "high", false),
      check("load_time", "performance", "high", false),
    ], { conversion: 41, seo: 52, trust: 60, performance: 66, security: 80 });

  it("starts with the same #1 the Decision Card leads with (continuity, quick wins first)", () => {
    const data = manyFailing();
    const phases = planRoadmap(data);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases[0].items[0].id).toBe(prioritize(data)!.lead.id);
  });

  it("never overloads a phase: at most 3 phases, at most 3 items each", () => {
    const phases = planRoadmap(manyFailing());
    expect(phases.length).toBeLessThanOrEqual(3);
    for (const phase of phases) {
      expect(phase.items.length).toBeGreaterThan(0);
      expect(phase.items.length).toBeLessThanOrEqual(3);
    }
  });

  it("shows approximate effort only, from the four allowed buckets", () => {
    const items = planRoadmap(manyFailing()).flatMap((p) => p.items);
    for (const item of items) {
      expect(TIME_BUCKETS).toContain(item.time);
    }
  });

  it("does not plan when there is nothing to sequence (one fix is the Decision Card's job)", () => {
    expect(planRoadmap(scan([check("cta", "conversion", "high", false)]))).toEqual([]);
  });
});
