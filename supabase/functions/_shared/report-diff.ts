// M7 — deterministic report diff. PURE (no I/O, no AI, no esm.sh imports) so it
// is unit-testable in vitest and identical in the Deno worker. Compares two
// immutable report snapshots. See M7_SPEC.md §9.

export interface SnapshotCheck {
  id: string;
  label?: string;
  category?: string;
  passed: boolean;
  impact?: string;   // 'high' | 'medium' | 'low'
  detail?: string;
}

export interface Snapshot {
  finalScore: number;
  categoryScores: Record<string, number>;
  auditChecks: SnapshotCheck[];
  pageSpeed:
    | { score?: number | null; lcp?: number | null; fcp?: number | null; tbt?: number | null; cls?: number | null; speedIndex?: number | null }
    | null;
  pageInfo:
    | { title?: string | null; metaDesc?: string | null; h1?: string | null; wordCount?: number | null; sectionCount?: number | null; imgCount?: number | null; ctaCount?: number | null }
    | null;
  // Additive monitoring signals captured by the worker (never in frozen analyze-website).
  monitoring?: { canonical?: string | null; robots?: boolean | null; sslExpiresAt?: string | null; reachable?: boolean };
}

export interface DiffCheck { id: string; label?: string; category?: string; impact?: string }

export interface ReportDiff {
  overallDelta: number;
  categoryDeltas: Record<string, number>;
  checks: { newFailed: DiffCheck[]; resolved: DiffCheck[]; changed: DiffCheck[] };
  pagespeedDeltas: Record<string, number>;
  metadataChanges: Record<string, { before: unknown; after: unknown }>;
  contentChanges: Record<string, { before: number | null; after: number | null }>;
  ssl: { expiresAt: string | null; daysLeft: number | null } | null;
  hasMaterialChange: boolean;
}

export const THRESHOLDS = {
  overall: 5,
  category: 8,
  pagespeedScore: 10,
  sslDays: [30, 14, 7] as const,
  lcpBands: [2500, 4000] as const,   // ms
  clsBands: [0.1, 0.25] as const,
};

const CATEGORIES = ["performance", "seo", "conversion", "trust", "security"] as const;
const isHigh = (impact?: string) => impact === "high";
const band = (v: number, edges: readonly number[]) => edges.reduce((acc, e) => acc + (v > e ? 1 : 0), 0);

function checkMeta(c: SnapshotCheck): DiffCheck {
  return { id: c.id, label: c.label, category: c.category, impact: c.impact };
}

/** Deterministic diff of two completed report snapshots. `nowMs` injected for tests. */
export function diffReports(prev: Snapshot, next: Snapshot, nowMs = Date.now()): ReportDiff {
  const overallDelta = next.finalScore - prev.finalScore;

  const categoryDeltas: Record<string, number> = {};
  for (const k of CATEGORIES) {
    const a = prev.categoryScores?.[k];
    const b = next.categoryScores?.[k];
    if (typeof a === "number" && typeof b === "number") categoryDeltas[k] = b - a;
  }

  // Check-level diff by id.
  const prevById = new Map(prev.auditChecks?.map((c) => [c.id, c]) ?? []);
  const nextById = new Map(next.auditChecks?.map((c) => [c.id, c]) ?? []);
  const newFailed: DiffCheck[] = [];
  const resolved: DiffCheck[] = [];
  const changed: DiffCheck[] = [];
  for (const [id, nc] of nextById) {
    const pc = prevById.get(id);
    if (!nc.passed && (!pc || pc.passed)) newFailed.push(checkMeta(nc));
    else if (nc.passed && pc && !pc.passed) resolved.push(checkMeta(nc));
    else if (pc && nc.passed === pc.passed && (nc.detail !== pc.detail || nc.impact !== pc.impact)) changed.push(checkMeta(nc));
  }

  // PageSpeed deltas.
  const pagespeedDeltas: Record<string, number> = {};
  if (prev.pageSpeed && next.pageSpeed) {
    for (const m of ["score", "lcp", "fcp", "tbt", "cls", "speedIndex"] as const) {
      const a = prev.pageSpeed[m];
      const b = next.pageSpeed[m];
      if (typeof a === "number" && typeof b === "number") pagespeedDeltas[m] = b - a;
    }
  }

  // Metadata changes.
  const metadataChanges: Record<string, { before: unknown; after: unknown }> = {};
  const pushIfChanged = (key: string, before: unknown, after: unknown) => {
    if ((before ?? null) !== (after ?? null)) metadataChanges[key] = { before: before ?? null, after: after ?? null };
  };
  pushIfChanged("title", prev.pageInfo?.title, next.pageInfo?.title);
  pushIfChanged("metaDesc", prev.pageInfo?.metaDesc, next.pageInfo?.metaDesc);
  pushIfChanged("h1", prev.pageInfo?.h1, next.pageInfo?.h1);
  pushIfChanged("canonical", prev.monitoring?.canonical, next.monitoring?.canonical);
  pushIfChanged("robots", prev.monitoring?.robots, next.monitoring?.robots);
  pushIfChanged("reachable", prev.monitoring?.reachable, next.monitoring?.reachable);

  // Content structure changes.
  const contentChanges: Record<string, { before: number | null; after: number | null }> = {};
  for (const m of ["wordCount", "sectionCount", "imgCount", "ctaCount"] as const) {
    const a = (prev.pageInfo?.[m] ?? null) as number | null;
    const b = (next.pageInfo?.[m] ?? null) as number | null;
    if (a !== b) contentChanges[m] = { before: a, after: b };
  }

  // SSL.
  let ssl: ReportDiff["ssl"] = null;
  const sslExp = next.monitoring?.sslExpiresAt ?? null;
  if (sslExp) {
    const daysLeft = Math.floor((new Date(sslExp).getTime() - nowMs) / 86_400_000);
    ssl = { expiresAt: sslExp, daysLeft };
  }

  // ── Materiality (noise suppression via thresholds + band crossings) ──
  let material = false;
  if (Math.abs(overallDelta) >= THRESHOLDS.overall) material = true;
  for (const k of Object.keys(categoryDeltas)) if (Math.abs(categoryDeltas[k]) >= THRESHOLDS.category) material = true;
  if (newFailed.some((c) => isHigh(c.impact)) || resolved.some((c) => isHigh(c.impact))) material = true;
  if (typeof pagespeedDeltas.score === "number" && Math.abs(pagespeedDeltas.score) >= THRESHOLDS.pagespeedScore) material = true;
  if (prev.pageSpeed?.lcp != null && next.pageSpeed?.lcp != null &&
      band(next.pageSpeed.lcp, THRESHOLDS.lcpBands) !== band(prev.pageSpeed.lcp, THRESHOLDS.lcpBands)) material = true;
  if (prev.pageSpeed?.cls != null && next.pageSpeed?.cls != null &&
      band(next.pageSpeed.cls, THRESHOLDS.clsBands) !== band(prev.pageSpeed.cls, THRESHOLDS.clsBands)) material = true;
  if (ssl && ssl.daysLeft != null && ssl.daysLeft <= 30) material = true;
  // robots/canonical disappearance, homepage unreachable.
  if (prev.monitoring?.robots === true && next.monitoring?.robots === false) material = true;
  if (prev.monitoring?.canonical && !next.monitoring?.canonical) material = true;
  if (prev.monitoring?.reachable === true && next.monitoring?.reachable === false) material = true;

  return { overallDelta, categoryDeltas, checks: { newFailed, resolved, changed }, pagespeedDeltas, metadataChanges, contentChanges, ssl, hasMaterialChange: material };
}
