import { describe, it, expect } from "vitest";
import {
  buildReportHtml,
  buildFooterTemplate,
  pdfRenderOptions,
  scoreBand,
  deriveRecommendations,
  groupFindings,
  type ReportForPdf,
  type PdfCheck,
} from "../../supabase/functions/render-pdf/pdf-template";

const CHECKS: PdfCheck[] = [
  { id: "ssl", label: "SSL-certifikat", category: "trust", passed: false, detail: "Saknas", impact: "high" },
  { id: "meta_desc", label: "Meta-beskrivning", category: "seo", passed: false, detail: "Saknas", impact: "high" },
  { id: "robots", label: "Robots meta-tagg", category: "security", passed: false, detail: "Saknas", impact: "low" },
  { id: "title", label: "Sidtitel", category: "seo", passed: true, detail: "Finns", impact: "high" },
  { id: "viewport", label: "Mobilanpassning", category: "performance", passed: true, detail: "Finns", impact: "high" },
];

const REPORT: ReportForPdf = {
  reportId: "abc-123-def",
  domain: "hemfrid.se",
  score: 78,
  categoryScores: { seo: 83, conversion: 56, trust: 100, performance: 93, security: 100 },
  status: "complete",
  analysisVersion: "2026-07-12b",
  scoringVersion: "engine-1",
  measuredAt: "2026-07-12T10:00:00Z",
  createdAt: "2026-07-12T10:05:00Z",
  summary: "Sidan presterar bra men har brister i förtroende.",
  businessSummary: "Ett städföretag.",
  industry: "Städtjänster",
  biggestProblem: "SSL saknas.",
  businessImpact: ["Besökare kan tveka."],
  opportunity: "Mest att vinna på förtroende.",
  quickFix: "Aktivera HTTPS.",
  strengths: ["Snabb sida."],
  weaknesses: ["SSL saknas."],
  auditChecks: CHECKS,
  aiInsight: {
    executiveSummary: { text: "Grundad sammanfattning.", evidenceCheckIds: ["ssl", "meta_desc"] },
    strengths: { items: ["Titel finns."], evidenceCheckIds: ["title"] },
    weaknesses: { items: ["SSL saknas."], evidenceCheckIds: ["ssl"] },
    opportunity: { text: "Förbättra förtroende.", evidenceCheckIds: ["ssl"] },
    quickFix: { text: "Aktivera HTTPS.", evidenceCheckIds: ["ssl"] },
  },
  roadmap: [
    { title: "Nu", intent: "Först", items: [{ action: "Aktivera HTTPS", time: "30 min" }] },
    { title: "Nästa", intent: "Sen", items: [{ action: "Lägg till meta-beskrivning" }] },
    { title: "Senare", intent: "Sist", items: [{ action: "Robots-tagg" }] },
  ],
};

const QR = '<svg id="qr-test"><rect/></svg>';
const html = buildReportHtml(REPORT, { qrSvg: QR });

describe("score band", () => {
  it("maps 78 to Good", () => expect(scoreBand(78).en).toBe("Good"));
  it("maps 90 to Excellent, 45 to Poor, 20 to Critical", () => {
    expect(scoreBand(90).en).toBe("Excellent");
    expect(scoreBand(45).en).toBe("Poor");
    expect(scoreBand(20).en).toBe("Critical");
  });
});

describe("recommendations derivation", () => {
  it("includes only failed checks, ordered by impact, with rank + gain", () => {
    const recs = deriveRecommendations(CHECKS);
    expect(recs.map((r) => r.title)).toEqual(["Meta-beskrivning", "SSL-certifikat", "Robots meta-tagg"]);
    expect(recs[0].rank).toBe(1);
    expect(recs[0].gain).toBe(3); // high impact
    expect(recs[2].gain).toBe(1); // low impact
    expect(recs.some((r) => r.title === "Sidtitel")).toBe(false); // passed → excluded
  });
});

describe("findings grouping", () => {
  it("splits into passed / warning (low fail) / failed (high|med fail)", () => {
    const g = groupFindings(CHECKS);
    expect(g.passed.map((c) => c.id).sort()).toEqual(["title", "viewport"]);
    expect(g.warning.map((c) => c.id)).toEqual(["robots"]);
    expect(g.failed.map((c) => c.id).sort()).toEqual(["meta_desc", "ssl"]);
  });
});

describe("premium HTML document", () => {
  it("is a full dark-themed A4 document with the brand background", () => {
    expect(html).toMatch(/<!DOCTYPE html>/);
    expect(html).toContain("#0A0B0F");
    expect(html).toContain("linear-gradient(120deg, #2DE2C8, #36A0F0 55%, #8B5CF6)");
  });
  it("has all eight pages of content", () => {
    expect(html).toContain("Website Analysis Report");     // cover
    expect(html).toContain("Executive Summary");           // page 1
    expect(html).toContain("Score Breakdown");             // page 2
    expect(html).toContain("AI Executive Analysis");       // page 3
    expect(html).toContain("Recommendations");             // page 4
    expect(html).toContain("Detailed Findings");           // page 5
    expect(html).toContain("Roadmap");                     // page 6
    expect(html).toContain("Improve your website");        // closing
    const pageCount = (html.match(/<section class="page/g) || []).length;
    expect(pageCount).toBe(8);
  });
  it("shows the domain, score and versions from the snapshot", () => {
    expect(html).toContain("hemfrid.se");
    expect(html).toContain(">78<");
    expect(html).toContain("2026-07-12b");
    expect(html).toContain("engine-1");
    expect(html).toContain("abc-123-def");
  });
  it("renders AI evidence references elegantly", () => {
    expect(html).toContain("Grundat på:");
    expect(html).toContain("SSL-certifikat"); // resolved from evidenceCheckId 'ssl'
  });
  it("embeds the provided QR and the report URL", () => {
    expect(html).toContain('id="qr-test"');
    expect(html).toContain("webscore.se/analys/abc-123-def");
  });
  it("escapes untrusted snapshot text (no HTML injection)", () => {
    const evil = buildReportHtml({ ...REPORT, domain: '<script>alert(1)</script>' }, { qrSvg: QR });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });
  it("is deterministic for the same snapshot (historical immutability)", () => {
    expect(buildReportHtml(REPORT, { qrSvg: QR })).toBe(html);
  });
});

describe("A4 render options + footer", () => {
  it("footer carries Page X of Y, report id and date", () => {
    const f = buildFooterTemplate("abc-123-def", "2026-07-12");
    expect(f).toContain('class="pageNumber"');
    expect(f).toContain('class="totalPages"');
    expect(f).toContain("abc-123-def");
    expect(f).toContain("2026-07-12");
    expect(f).toContain("Webscore");
  });
  it("options are A4, full-bleed, print-background, footer'd", () => {
    const o = pdfRenderOptions("abc-123-def", "2026-07-12");
    expect(o.format).toBe("A4");
    expect(o.printBackground).toBe(true);
    expect(o.displayHeaderFooter).toBe(true);
    expect(o.margin).toEqual({ top: "0mm", right: "0mm", bottom: "16mm", left: "0mm" });
  });
});
