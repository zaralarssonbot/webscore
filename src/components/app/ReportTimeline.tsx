import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreColor } from "@/lib/score-color";
import { requestReportPdf } from "@/lib/report-service";
import { listReports, type HistoryFilters } from "@/lib/account/history-service";
import type { ReportListRow } from "@/lib/account/types";
import ScoreDelta from "./ScoreDelta";
import EmptyState from "./EmptyState";

function Item({ row, prevScore }: { row: ReportListRow; prevScore: number | null }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const color = scoreColor(row.final_score);
  const delta = prevScore == null ? null : row.final_score - prevScore;
  const date = new Date(row.created_at).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });

  const downloadPdf = async () => {
    setPdfBusy(true);
    const r = await requestReportPdf(row.id);
    setPdfBusy(false);
    if ("url" in r) window.open(r.url, "_blank");
    else toast.error(r.error === "pdf_renderer_not_configured" ? "PDF-tjänsten är inte aktiverad ännu" : "Kunde inte skapa PDF");
  };

  return (
    <div className="card-surface px-4 py-3 flex items-center gap-3">
      <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0"
        style={{ borderColor: color.hsl, color: color.hsl }}>
        {row.final_score}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{row.title || row.normalized_domain}</span>
          <ScoreDelta delta={delta} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{date}</span>
          {row.status === "partial" && <span className="text-score-mid">Delvis</span>}
          <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />AI</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={downloadPdf} disabled={pdfBusy} aria-label="Ladda ner PDF">
        {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to={`/analys/${row.id}`}>Öppna</Link>
      </Button>
    </div>
  );
}

export default function ReportTimeline({ filters }: { filters: HistoryFilters }) {
  const [items, setItems] = useState<ReportListRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const key = JSON.stringify(filters);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(false);
    const page = await listReports(filters, null);
    setItems(page.items);
    setCursor(page.nextCursor);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const page = await listReports(filters, cursor);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (error) return <div className="card-surface p-6 text-center text-sm text-muted-foreground">Kunde inte hämta historik.</div>;
  if (items.length === 0) return <EmptyState icon={FileText} title="Inga analyser ännu" description="När du kör analyser dyker de upp här." />;

  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <Item
          key={row.id}
          row={row}
          // Delta vs the previous analysis is only meaningful within one domain.
          prevScore={filters.domainId && i + 1 < items.length ? items[i + 1].final_score : null}
        />
      ))}
      {cursor && (
        <div className="pt-2 text-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ladda fler"}
          </Button>
        </div>
      )}
      {!cursor && items.length > 0 && <p className="text-center text-xs text-muted-foreground pt-2">Inga fler analyser</p>}
    </div>
  );
}
