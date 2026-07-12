// Pure, dependency-free premium PDF report template.
//
// Turns an IMMUTABLE report snapshot into a branded, executive A4 HTML document
// (dark Webscore theme, calibration-ring gradient). It renders ONLY the stored
// snapshot — it never recomputes the score, re-runs AI, or re-derives anything
// that would change historical output; the recommendation/finding groupings are
// pure presentation of the already-measured checks. No Deno/network deps so it
// is unit-testable and reusable by the render-pdf function and local tooling.

export type Impact = "high" | "medium" | "low";

export interface PdfCheck {
  id: string; label: string; category: string; passed: boolean; detail: string; impact: Impact;
}
export interface PdfEvidenceText { text: string; evidenceCheckIds: string[] }
export interface PdfEvidenceList { items: string[]; evidenceCheckIds: string[] }
export interface PdfAiInsight {
  industry?: string; businessSummary?: string;
  executiveSummary?: PdfEvidenceText; biggestProblem?: PdfEvidenceText;
  businessImpact?: PdfEvidenceList; quickFix?: PdfEvidenceText;
  strengths?: PdfEvidenceList; weaknesses?: PdfEvidenceList; opportunity?: PdfEvidenceText;
}
export interface PdfRoadmapItem { action: string; time?: string }
export interface PdfRoadmapPhase { title: string; intent?: string; items: PdfRoadmapItem[] }

export interface ReportForPdf {
  reportId: string;
  domain: string;
  score: number;
  categoryScores: { seo: number; conversion: number; trust: number; performance: number; security: number };
  status: "complete" | "partial";
  analysisVersion: string;
  scoringVersion: string;
  measuredAt?: string | null;
  createdAt?: string | null;
  // Flat AI prose (already validated + grounded in M3).
  summary?: string;
  businessSummary?: string;
  industry?: string;
  biggestProblem?: string;
  businessImpact?: string[];
  opportunity?: string;
  quickFix?: string;
  strengths?: string[];
  weaknesses?: string[];
  auditChecks?: PdfCheck[];
  aiInsight?: PdfAiInsight;
  roadmap?: PdfRoadmapPhase[];
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const IMPACT_POINTS: Record<Impact, number> = { high: 3, medium: 2, low: 1 };
const IMPACT_RANK: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
const IMPACT_SV: Record<Impact, string> = { high: "Hög", medium: "Medel", low: "Låg" };
const EFFORT_SV: Record<Impact, string> = { high: "Låg", medium: "Medel", low: "Enkel" }; // inverse: high impact fixes are worth prioritising

const CATEGORIES: { key: keyof ReportForPdf["categoryScores"]; label: string }[] = [
  { key: "performance", label: "Prestanda" },
  { key: "seo", label: "SEO & synlighet" },
  { key: "trust", label: "Förtroende" },
  { key: "conversion", label: "Användarupplevelse (UX)" },
  { key: "security", label: "Säkerhet" },
];

export function scoreBand(score: number): { en: string; sv: string } {
  if (score >= 85) return { en: "Excellent", sv: "Utmärkt" };
  if (score >= 70) return { en: "Good", sv: "Bra" };
  if (score >= 55) return { en: "Fair", sv: "Godkänt" };
  if (score >= 40) return { en: "Poor", sv: "Svagt" };
  return { en: "Critical", sv: "Kritiskt" };
}

const RING = `<svg width="64" height="64" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="rg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#2DE2C8"/><stop offset="0.5" stop-color="#36A0F0"/><stop offset="1" stop-color="#8B5CF6"/>
  </linearGradient></defs>
  <path d="M96.8,44.4 A40,40 0 1 1 75.6,23.2" fill="none" stroke="url(#rg)" stroke-width="9" stroke-linecap="round"/>
  <circle cx="88.3" cy="31.7" r="7.5" fill="url(#rg)"/></svg>`;

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  // Deterministic YYYY-MM-DD (no locale/timezone surprises in tests).
  return String(iso).slice(0, 10);
}

/** Resolve evidence ids → check labels for elegant references. */
function evidenceLabels(ids: string[] | undefined, checks: PdfCheck[]): string[] {
  if (!ids?.length) return [];
  const byId = new Map(checks.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)?.label).filter(Boolean) as string[];
}

/** Every recommendation, derived (for display) from the failed measured checks. */
export function deriveRecommendations(checks: PdfCheck[]) {
  return checks
    .filter((c) => !c.passed)
    .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || a.id.localeCompare(b.id))
    .map((c, i) => ({
      rank: i + 1, title: c.label, detail: c.detail, category: c.category,
      impact: IMPACT_SV[c.impact], difficulty: EFFORT_SV[c.impact], gain: IMPACT_POINTS[c.impact],
    }));
}

/** Passed / Warning (low-impact fail) / Failed (high|medium fail). */
export function groupFindings(checks: PdfCheck[]) {
  const passed = checks.filter((c) => c.passed);
  const warning = checks.filter((c) => !c.passed && c.impact === "low");
  const failed = checks.filter((c) => !c.passed && c.impact !== "low");
  return { passed, warning, failed };
}

// ── Page builders ──────────────────────────────────────────────────
function coverPage(r: ReportForPdf): string {
  const band = scoreBand(r.score);
  return `<section class="page cover">
    <div class="cover-top">${RING}<span class="wordmark">Webscore</span></div>
    <div class="cover-mid">
      <div class="eyebrow">Website Analysis Report</div>
      <h1 class="domain">${esc(r.domain)}</h1>
      <div class="score-hero"><span class="score-num gradient-text">${r.score}</span><span class="score-den">/ 100</span></div>
      <div class="band">${esc(band.en)} · ${esc(band.sv)}</div>
    </div>
    <div class="cover-meta">
      <div><span class="k">Datum</span><span class="v">${esc(fmtDate(r.createdAt) || fmtDate(r.measuredAt))}</span></div>
      <div><span class="k">Report ID</span><span class="v mono">${esc(r.reportId)}</span></div>
      <div><span class="k">Analysis version</span><span class="v mono">${esc(r.analysisVersion)}</span></div>
      <div><span class="k">Scoring version</span><span class="v mono">${esc(r.scoringVersion)}</span></div>
    </div>
    <div class="cover-foot">Generated by Webscore</div>
  </section>`;
}

function execSummaryPage(r: ReportForPdf): string {
  const band = scoreBand(r.score);
  const impacts = (r.businessImpact ?? []).map((t) => `<li>${esc(t)}</li>`).join("");
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">01 — Executive Summary</span></div>
    <div class="hero-score-row">
      <div class="hs-num gradient-text">${r.score}<span class="hs-den">/100</span></div>
      <div class="hs-side"><div class="hs-band">${esc(band.en)}</div><div class="hs-industry">${esc(r.industry || "Bransch ej fastställd")}</div></div>
    </div>
    ${r.summary ? `<p class="lede">${esc(r.summary)}</p>` : ""}
    ${r.businessSummary ? `<div class="block"><h3>Om verksamheten</h3><p>${esc(r.businessSummary)}</p></div>` : ""}
    ${r.biggestProblem ? `<div class="block callout"><h3>Största problemet</h3><p>${esc(r.biggestProblem)}</p></div>` : ""}
    ${impacts ? `<div class="block"><h3>Affärspåverkan</h3><ul class="clean">${impacts}</ul></div>` : ""}
    <div class="two-col">
      ${r.opportunity ? `<div class="block"><h3>Störst möjlighet</h3><p>${esc(r.opportunity)}</p></div>` : ""}
      ${r.quickFix ? `<div class="block"><h3>Snabb vinst</h3><p>${esc(r.quickFix)}</p></div>` : ""}
    </div>
  </section>`;
}

function breakdownPage(r: ReportForPdf): string {
  const rows = CATEGORIES.map((c) => {
    const v = r.categoryScores[c.key] ?? 0;
    return `<div class="bar-row"><span class="bar-label">${esc(c.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(2, Math.min(100, v))}%"></span></span>
      <span class="bar-val">${v}</span></div>`;
  }).join("");
  const scored = CATEGORIES.map((c) => ({ label: c.label, v: r.categoryScores[c.key] ?? 0 }));
  const best = [...scored].sort((a, b) => b.v - a.v)[0];
  const worst = [...scored].sort((a, b) => a.v - b.v)[0];
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">02 — Score Breakdown</span></div>
    <div class="overall-chip"><span class="oc-num gradient-text">${r.score}</span><span class="oc-lbl">Totalbetyg / 100</span></div>
    <div class="bars">${rows}</div>
    <div class="two-col mt">
      <div class="block best"><h3>Bästa kategori</h3><p><b>${esc(best.label)}</b> — ${best.v}/100</p></div>
      <div class="block worst"><h3>Svagaste kategori</h3><p><b>${esc(worst.label)}</b> — ${worst.v}/100</p></div>
    </div>
  </section>`;
}

function aiPage(r: ReportForPdf): string {
  const checks = r.auditChecks ?? [];
  const ai = r.aiInsight;
  const evLine = (ids?: string[]) => {
    const labels = evidenceLabels(ids, checks);
    return labels.length ? `<div class="evidence">Grundat på: ${labels.map(esc).join(" · ")}</div>` : "";
  };
  const listBlock = (title: string, sec?: PdfEvidenceList) =>
    sec && sec.items?.length
      ? `<div class="block"><h3>${esc(title)}</h3><ul class="clean">${sec.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>${evLine(sec.evidenceCheckIds)}</div>`
      : "";
  const textBlock = (title: string, sec?: PdfEvidenceText) =>
    sec && sec.text ? `<div class="block"><h3>${esc(title)}</h3><p>${esc(sec.text)}</p>${evLine(sec.evidenceCheckIds)}</div>` : "";
  const body = ai
    ? [
        textBlock("Sammanfattning", ai.executiveSummary),
        listBlock("Styrkor", ai.strengths),
        listBlock("Svagheter", ai.weaknesses),
        textBlock("Möjlighet", ai.opportunity),
        textBlock("Snabb åtgärd", ai.quickFix),
      ].join("")
    : `<p class="muted">Ingen AI-analys sparad för denna rapport.</p>`;
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">03 — AI Executive Analysis</span></div>
    ${body}
  </section>`;
}

function recommendationsPage(r: ReportForPdf): string {
  const recs = deriveRecommendations(r.auditChecks ?? []);
  const rows = recs.length
    ? recs.map((x) => `<div class="rec">
        <div class="rec-rank gradient-text">${String(x.rank).padStart(2, "0")}</div>
        <div class="rec-body"><div class="rec-title">${esc(x.title)}</div><div class="rec-detail">${esc(x.detail)}</div></div>
        <div class="rec-meta"><span class="tag">Påverkan: ${esc(x.impact)}</span><span class="tag">Svårighet: ${esc(x.difficulty)}</span><span class="tag">Vinst: +${x.gain}p</span></div>
      </div>`).join("")
    : `<p class="muted">Inga åtgärder att rekommendera – sidan klarar samtliga kontroller.</p>`;
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">04 — Recommendations</span></div>
    <div class="recs">${rows}</div>
  </section>`;
}

function findingsPage(r: ReportForPdf): string {
  const g = groupFindings(r.auditChecks ?? []);
  const item = (c: PdfCheck, sym: string, cls: string) =>
    `<div class="finding"><span class="fi-dot ${cls}">${sym}</span><span class="fi-label">${esc(c.label)}</span><span class="fi-detail">${esc(c.detail)}</span></div>`;
  const grp = (title: string, arr: PdfCheck[], sym: string, cls: string) =>
    arr.length ? `<div class="find-group"><h3 class="fg-title ${cls}-t">${esc(title)} <span class="count">${arr.length}</span></h3>${arr.map((c) => item(c, sym, cls)).join("")}</div>` : "";
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">05 — Detailed Findings</span></div>
    ${grp("Godkänt", g.passed, "✓", "ok")}
    ${grp("Att se över", g.warning, "!", "warn")}
    ${grp("Åtgärda", g.failed, "✕", "fail")}
  </section>`;
}

function roadmapPage(r: ReportForPdf): string {
  const phases = r.roadmap && r.roadmap.length
    ? r.roadmap
    : (() => {
        // Fallback: derive Now/Next/Later from failed checks by severity.
        const f = (r.auditChecks ?? []).filter((c) => !c.passed).sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact]);
        const slice = (a: number, b: number): PdfRoadmapPhase["items"] => f.slice(a, b).map((c) => ({ action: c.label }));
        return [
          { title: "Nu", intent: "Största effekten först", items: slice(0, 3) },
          { title: "Nästa", intent: "Bygg vidare", items: slice(3, 6) },
          { title: "Senare", intent: "Finjustering", items: slice(6, 10) },
        ] as PdfRoadmapPhase[];
      })();
  const labels = ["Nu", "Nästa", "Senare"];
  const cols = phases.slice(0, 3).map((p, i) => `<div class="rm-col">
    <div class="rm-node"><span class="rm-dot"></span><span class="rm-title">${esc(p.title || labels[i])}</span></div>
    ${p.intent ? `<div class="rm-intent">${esc(p.intent)}</div>` : ""}
    <ul class="rm-items">${p.items.map((it) => `<li>${esc(it.action)}${it.time ? ` <span class="rm-time">${esc(it.time)}</span>` : ""}</li>`).join("")}</ul>
  </div>`).join("");
  return `<section class="page">
    <div class="page-head"><span class="ph-eyebrow gradient-text">06 — Roadmap</span></div>
    <div class="rm-line"></div>
    <div class="rm-grid">${cols}</div>
  </section>`;
}

function closingPage(r: ReportForPdf, qrSvg: string): string {
  return `<section class="page closing">
    <div class="cl-brand">${RING}<span class="wordmark">Webscore</span></div>
    <h2 class="cl-cta gradient-text">Improve your website<br/>with Webscore.</h2>
    <p class="cl-sub">Vi bygger hemsidor som faktiskt genererar kunder. Den här rapporten visar var vi börjar.</p>
    <div class="qr-wrap">
      <div class="qr">${qrSvg}</div>
      <div class="qr-cap">Skanna för att öppna rapporten<br/><span class="mono">webscore.se/analys/${esc(r.reportId)}</span></div>
    </div>
  </section>`;
}

const STYLE = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #0A0B0F; color: #F2F5FA;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  .gradient-text { background: linear-gradient(120deg, #2DE2C8, #36A0F0 55%, #8B5CF6);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mono { font-family: "SF Mono", ui-monospace, Menlo, monospace; }
  .muted { color: #8792A6; }
  .page { position: relative; width: 210mm; min-height: 281mm; padding: 22mm 20mm 14mm;
    background: #0A0B0F; break-after: page; overflow: hidden; }
  .page:last-child { break-after: auto; }
  .page-head { margin-bottom: 12mm; }
  .ph-eyebrow { font-size: 12pt; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; }

  /* Cover */
  .cover { display: flex; flex-direction: column; min-height: 281mm; }
  .cover-top { display: flex; align-items: center; gap: 12px; }
  .wordmark { font-size: 20pt; font-weight: 700; letter-spacing: -.01em; }
  .cover-mid { margin-top: auto; margin-bottom: auto; }
  .cover .eyebrow { font-size: 12pt; letter-spacing: .22em; text-transform: uppercase; color: #8792A6; margin-bottom: 10mm; }
  .cover .domain { font-size: 40pt; font-weight: 700; letter-spacing: -.02em; margin: 0 0 8mm; }
  .score-hero { display: flex; align-items: baseline; gap: 10px; }
  .score-num { font-size: 96pt; font-weight: 800; line-height: 1; }
  .score-den { font-size: 24pt; color: #8792A6; font-weight: 600; }
  .band { margin-top: 6mm; font-size: 15pt; color: #F2F5FA; letter-spacing: .04em; }
  .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 10mm; margin-top: 10mm;
    border-top: 1px solid rgba(255,255,255,.09); padding-top: 8mm; }
  .cover-meta .k { display: block; font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: #6B7688; }
  .cover-meta .v { display: block; font-size: 11pt; margin-top: 2px; }
  .cover-foot { margin-top: 8mm; font-size: 9pt; color: #6B7688; letter-spacing: .1em; text-transform: uppercase; }

  h1,h2,h3 { text-wrap: balance; }
  h3 { font-size: 12.5pt; font-weight: 700; margin: 0 0 3mm; color: #F2F5FA; }
  p { font-size: 11pt; line-height: 1.6; color: #C7CEDB; margin: 0 0 3mm; }
  .lede { font-size: 13.5pt; line-height: 1.55; color: #E7EAF0; margin-bottom: 8mm; }
  .block { margin-bottom: 7mm; }
  .callout { border-left: 3px solid #36A0F0; padding-left: 6mm; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .two-col.mt { margin-top: 6mm; }
  ul.clean { margin: 0; padding: 0; list-style: none; }
  ul.clean li { font-size: 11pt; line-height: 1.55; color: #C7CEDB; padding-left: 6mm; position: relative; margin-bottom: 2.5mm; }
  ul.clean li::before { content: ""; position: absolute; left: 0; top: 8px; width: 6px; height: 6px; border-radius: 50%;
    background: linear-gradient(120deg,#2DE2C8,#8B5CF6); }
  .evidence { font-size: 8.5pt; color: #6B7688; margin-top: 2mm; letter-spacing: .02em; }

  .hero-score-row { display: flex; align-items: center; gap: 12mm; margin-bottom: 8mm; }
  .hs-num { font-size: 64pt; font-weight: 800; line-height: 1; }
  .hs-den { font-size: 20pt; color: #8792A6; }
  .hs-band { font-size: 16pt; font-weight: 700; }
  .hs-industry { font-size: 11pt; color: #8792A6; margin-top: 2mm; }

  .overall-chip { display: inline-flex; align-items: baseline; gap: 8px; margin-bottom: 9mm; }
  .oc-num { font-size: 40pt; font-weight: 800; }
  .oc-lbl { font-size: 11pt; color: #8792A6; }
  .bars { display: flex; flex-direction: column; gap: 5mm; }
  .bar-row { display: grid; grid-template-columns: 52mm 1fr 14mm; align-items: center; gap: 6mm; }
  .bar-label { font-size: 11pt; color: #E7EAF0; }
  .bar-track { height: 9px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg,#2DE2C8,#36A0F0 55%,#8B5CF6); }
  .bar-val { font-size: 12pt; font-weight: 700; text-align: right; }
  .best { border-left: 3px solid #2DE2C8; padding-left: 6mm; }
  .worst { border-left: 3px solid #8B5CF6; padding-left: 6mm; }

  .recs { display: flex; flex-direction: column; gap: 4mm; }
  .rec { display: grid; grid-template-columns: 14mm 1fr auto; gap: 5mm; align-items: start;
    border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 5mm 6mm; background: #12141B; break-inside: avoid; }
  .rec-rank { font-size: 20pt; font-weight: 800; }
  .rec-title { font-size: 11.5pt; font-weight: 700; }
  .rec-detail { font-size: 9.5pt; color: #8792A6; margin-top: 1mm; }
  .rec-meta { display: flex; flex-direction: column; gap: 2mm; align-items: flex-end; }
  .tag { font-size: 8pt; color: #C7CEDB; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; padding: 1.5mm 3mm; white-space: nowrap; }

  .find-group { margin-bottom: 6mm; break-inside: avoid; }
  .fg-title { font-size: 11pt; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 3mm; }
  .fg-title .count { color: #6B7688; font-weight: 400; }
  .ok-t { color: #2DE2C8; } .warn-t { color: #F5C451; } .fail-t { color: #FF7A6B; }
  .finding { display: grid; grid-template-columns: 6mm 55mm 1fr; align-items: baseline; gap: 3mm; padding: 1.6mm 0;
    border-bottom: 1px solid rgba(255,255,255,.05); break-inside: avoid; }
  .fi-dot { font-size: 9pt; font-weight: 700; }
  .fi-dot.ok { color: #2DE2C8; } .fi-dot.warn { color: #F5C451; } .fi-dot.fail { color: #FF7A6B; }
  .fi-label { font-size: 9.5pt; color: #E7EAF0; }
  .fi-detail { font-size: 8.5pt; color: #8792A6; }

  .rm-line { height: 2px; background: linear-gradient(90deg,#2DE2C8,#36A0F0,#8B5CF6); border-radius: 2px; margin-bottom: 6mm; }
  .rm-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8mm; }
  .rm-node { display: flex; align-items: center; gap: 6px; }
  .rm-dot { width: 10px; height: 10px; border-radius: 50%; background: linear-gradient(120deg,#2DE2C8,#8B5CF6); }
  .rm-title { font-size: 14pt; font-weight: 700; }
  .rm-intent { font-size: 9pt; color: #8792A6; margin: 2mm 0 4mm; }
  .rm-items { margin: 0; padding: 0; list-style: none; }
  .rm-items li { font-size: 10pt; color: #C7CEDB; padding: 2mm 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .rm-time { font-size: 8pt; color: #6B7688; }

  .closing { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 281mm; }
  .cl-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16mm; }
  .cl-cta { font-size: 34pt; font-weight: 800; line-height: 1.1; margin: 0 0 6mm; }
  .cl-sub { font-size: 12pt; color: #8792A6; max-width: 120mm; margin: 0 auto 14mm; }
  .qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 5mm; }
  .qr { width: 42mm; height: 42mm; background: #fff; border-radius: 12px; padding: 4mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .qr-cap { font-size: 9.5pt; color: #8792A6; line-height: 1.5; }
`;

/** Build the full premium report HTML from the immutable snapshot. */
export function buildReportHtml(r: ReportForPdf, opts: { qrSvg: string }): string {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Webscore – ${esc(r.domain)} (${r.score}/100)</title>
<style>${STYLE}</style></head>
<body>
${coverPage(r)}
${execSummaryPage(r)}
${breakdownPage(r)}
${aiPage(r)}
${recommendationsPage(r)}
${findingsPage(r)}
${roadmapPage(r)}
${closingPage(r, opts.qrSvg)}
</body></html>`;
}

/** Footer template for headless-Chromium page.pdf (Page X of Y · id · date · brand). */
export function buildFooterTemplate(reportId: string, dateStr: string): string {
  return `<div style="width:100%;height:14mm;background:#0A0B0F;color:#6B7688;font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:7pt;
    display:flex;align-items:center;justify-content:space-between;padding:0 20mm;border-top:1px solid rgba(255,255,255,0.1);">
    <span>Webscore</span>
    <span>Report ${esc(reportId)} · ${esc(dateStr)}</span>
    <span>Sida <span class="pageNumber"></span> av <span class="totalPages"></span></span>
  </div>`;
}

/** page.pdf / Browserless options for an A4, full-bleed, footer'd render. */
export function pdfRenderOptions(reportId: string, dateStr: string) {
  return {
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: buildFooterTemplate(reportId, dateStr),
    margin: { top: "0mm", right: "0mm", bottom: "16mm", left: "0mm" },
    preferCSSPageSize: false,
  };
}
