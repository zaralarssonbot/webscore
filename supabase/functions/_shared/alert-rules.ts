// M7 — deterministic alert rules. PURE. Given a ReportDiff, produce alert specs
// with severity. AI NEVER runs here — severity + existence are deterministic.
// See M7_SPEC.md §10.

import type { ReportDiff, DiffCheck } from "./report-diff.ts";

export type Severity = "positive" | "info" | "warning" | "critical";

export interface AlertSpec {
  ruleKey: string;
  severity: Severity;
  title: string;
  summary: string;
  before?: string;
  after?: string;
}

const CAT_LABEL: Record<string, string> = {
  performance: "Prestanda", seo: "SEO", conversion: "UX/Konvertering", trust: "Förtroende", security: "Säkerhet",
};

/** Evaluate deterministic alert rules against a diff. Order: critical first is not required (worker sorts). */
export function evaluateAlerts(diff: ReportDiff, ctx: { domain: string }): AlertSpec[] {
  const out: AlertSpec[] = [];
  const d = ctx.domain;

  // Overall score.
  if (diff.overallDelta <= -5) {
    out.push({ ruleKey: "overall_drop", severity: diff.overallDelta <= -10 ? "critical" : "warning",
      title: `Poängen sjönk för ${d}`, summary: `Totalpoängen ändrades ${diff.overallDelta}.`,
      before: String(-diff.overallDelta + 0), after: String(diff.overallDelta) });
  } else if (diff.overallDelta >= 5) {
    out.push({ ruleKey: "overall_gain", severity: "positive",
      title: `Poängen ökade för ${d}`, summary: `Totalpoängen ökade +${diff.overallDelta}.`, after: `+${diff.overallDelta}` });
  }

  // Category deltas.
  for (const [k, delta] of Object.entries(diff.categoryDeltas)) {
    const label = CAT_LABEL[k] ?? k;
    if (delta <= -8) out.push({ ruleKey: `category_drop:${k}`, severity: delta <= -15 ? "critical" : "warning",
      title: `${label} försämrades för ${d}`, summary: `${label} ändrades ${delta}.`, after: String(delta) });
    else if (delta >= 8) out.push({ ruleKey: `category_gain:${k}`, severity: "positive",
      title: `${label} förbättrades för ${d}`, summary: `${label} ökade +${delta}.`, after: `+${delta}` });
  }

  // Critical checks (impact high) flipping.
  const isHigh = (c: DiffCheck) => c.impact === "high";
  for (const c of diff.checks.newFailed.filter(isHigh)) {
    const sev: Severity = c.category === "security" || c.category === "trust" ? "critical" : "warning";
    out.push({ ruleKey: `check_fail:${c.id}`, severity: sev,
      title: `Ny brist på ${d}: ${c.label ?? c.id}`, summary: `Kontrollen "${c.label ?? c.id}" gick från godkänd till underkänd.`, before: "godkänd", after: "underkänd" });
  }
  for (const c of diff.checks.resolved.filter(isHigh)) {
    out.push({ ruleKey: `check_resolved:${c.id}`, severity: "positive",
      title: `Löst på ${d}: ${c.label ?? c.id}`, summary: `Kontrollen "${c.label ?? c.id}" är nu godkänd.`, before: "underkänd", after: "godkänd" });
  }

  // PageSpeed.
  const ps = diff.pagespeedDeltas.score;
  if (typeof ps === "number") {
    if (ps <= -10) out.push({ ruleKey: "pagespeed_drop", severity: ps <= -25 ? "critical" : "warning",
      title: `Prestanda försämrades för ${d}`, summary: `PageSpeed-poängen ändrades ${ps}.`, after: String(ps) });
    else if (ps >= 10) out.push({ ruleKey: "pagespeed_gain", severity: "positive",
      title: `Prestanda förbättrades för ${d}`, summary: `PageSpeed-poängen ökade +${ps}.`, after: `+${ps}` });
  }

  // SSL expiry — tightest crossed bucket.
  if (diff.ssl && diff.ssl.daysLeft != null && diff.ssl.daysLeft <= 30) {
    const dl = diff.ssl.daysLeft;
    const bucket = dl <= 7 ? 7 : dl <= 14 ? 14 : 30;
    out.push({ ruleKey: `ssl_expiry:${bucket}`, severity: dl <= 7 ? "critical" : "warning",
      title: `SSL-certifikatet går ut snart för ${d}`, summary: `Certifikatet går ut om ${dl} dagar.`, after: `${dl} dagar` });
  }

  // robots / canonical disappearance, homepage unreachable.
  const mc = diff.metadataChanges;
  if (mc.robots && mc.robots.before === true && mc.robots.after === false)
    out.push({ ruleKey: "robots_missing", severity: "warning", title: `robots.txt saknas för ${d}`, summary: "robots.txt fanns tidigare men saknas nu.", before: "fanns", after: "saknas" });
  if (mc.canonical && mc.canonical.before && !mc.canonical.after)
    out.push({ ruleKey: "canonical_missing", severity: "warning", title: `Canonical-tagg saknas för ${d}`, summary: "Canonical-taggen fanns tidigare men saknas nu.", before: String(mc.canonical.before), after: "saknas" });
  if (mc.reachable && mc.reachable.before === true && mc.reachable.after === false)
    out.push({ ruleKey: "homepage_unreachable", severity: "critical", title: `Startsidan kunde inte nås för ${d}`, summary: "Startsidan svarade inte vid senaste övervakning.", before: "nåbar", after: "onåbar" });

  return out;
}
