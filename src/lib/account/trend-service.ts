import { supabase } from "@/integrations/supabase/client";
import { type TrendPoint, type RangeKey, rangeSince, downsample } from "./trend-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface RawRow {
  final_score: number;
  category_scores: Record<string, number> | null;
  measured_at: string | null;
  created_at: string;
}

function toPoint(r: RawRow): TrendPoint {
  return {
    ts: r.measured_at ?? r.created_at,
    score: r.final_score,
    categories: r.category_scores ?? {},
  };
}

/** Chronological trend points for a domain within a range. Light columns only. */
export async function getTrend(domainId: string, range: RangeKey): Promise<TrendPoint[]> {
  let q = db
    .from("reports")
    .select("final_score, category_scores, measured_at, created_at")
    .eq("domain_id", domainId);
  const since = rangeSince(range, Date.now());
  if (since) q = q.gte("created_at", since);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) {
    console.error("[trend-service] getTrend:", error);
    return [];
  }
  const points = ((data ?? []) as RawRow[]).map(toPoint);
  return downsample(points, 200);
}

/** Last N overall-score points for a compact sparkline (chronological). */
export async function getSparkline(domainId: string, n = 8): Promise<number[]> {
  const { data, error } = await db
    .from("reports")
    .select("final_score, created_at")
    .eq("domain_id", domainId)
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) {
    console.error("[trend-service] getSparkline:", error);
    return [];
  }
  return ((data ?? []) as RawRow[]).map((r) => r.final_score).reverse();
}
