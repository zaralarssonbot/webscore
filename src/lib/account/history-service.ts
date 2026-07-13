import { supabase } from "@/integrations/supabase/client";
import type { ReportListRow } from "./types";
import { HISTORY_PAGE_SIZE } from "./limits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface HistoryFilters {
  domainId?: string;
  status?: "complete" | "partial";
  hasPdf?: boolean;
  from?: string; // ISO date lower bound (created_at)
  to?: string;   // ISO date upper bound
}

export interface HistoryPage {
  items: ReportListRow[];
  nextCursor: string | null;
}

const LIST_COLUMNS =
  "id, normalized_domain, final_score, category_scores, status, measured_at, created_at, domain_id, title, pdf_path";

/**
 * Keyset-paginated report history for the signed-in user. RLS scopes rows to
 * the caller (owner-read policy). Ordered by created_at desc; the cursor is the
 * created_at of the last item. Never selects report_data.
 */
export async function listReports(
  filters: HistoryFilters = {},
  cursor: string | null = null,
  pageSize = HISTORY_PAGE_SIZE,
): Promise<HistoryPage> {
  let q = db.from("reports").select(LIST_COLUMNS);

  if (filters.domainId) q = q.eq("domain_id", filters.domainId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.hasPdf) q = q.not("pdf_path", "is", null);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  if (cursor) q = q.lt("created_at", cursor);

  const { data, error } = await q.order("created_at", { ascending: false }).limit(pageSize + 1);
  if (error) {
    console.error("[history-service] listReports:", error);
    return { items: [], nextCursor: null };
  }
  const rows = (data ?? []) as ReportListRow[];
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}

/** Search a user's reports by domain substring (trigram index). */
export async function searchReports(query: string, limit = 20): Promise<ReportListRow[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await db
    .from("reports")
    .select(LIST_COLUMNS)
    .ilike("normalized_domain", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[history-service] searchReports:", error);
    return [];
  }
  return (data ?? []) as ReportListRow[];
}
