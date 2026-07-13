import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import { useEntitlements } from "@/hooks/useEntitlements";
import { retentionSince } from "@/lib/billing/entitlements-service";
import { listDomains } from "@/lib/account/domain-service";
import type { HistoryFilters } from "@/lib/account/history-service";
import ReportTimeline from "@/components/app/ReportTimeline";

type StatusFilter = "all" | "complete" | "partial";

export default function HistoryPage() {
  useDocumentMeta({ title: "Historik – Webscore", noindex: true });
  const { user } = useAuth();
  const [domainId, setDomainId] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [hasPdf, setHasPdf] = useState(false);

  const { data: domains = [] } = useQuery({
    queryKey: ["domains", user?.id, "all"],
    queryFn: () => listDomains(true),
    enabled: !!user,
  });
  const { data: ent } = useEntitlements();

  const filters: HistoryFilters = {
    domainId: domainId || undefined,
    status: status === "all" ? undefined : status,
    hasPdf: hasPdf || undefined,
    // M6: history retention — Free sees the last 30 days; higher plans unlimited.
    from: retentionSince(ent?.limits.history_days) ?? undefined,
  };

  const selectCls = "h-9 rounded-lg border border-border bg-white/5 px-3 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Historik</h1>
        <p className="text-sm text-muted-foreground">Alla dina analyser, rapporter och PDF:er.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={domainId} onChange={(e) => setDomainId(e.target.value)}>
          <option value="">Alla domäner</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.display_name || d.normalized_domain}</option>
          ))}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">Alla status</option>
          <option value="complete">Fullständig</option>
          <option value="partial">Delvis</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={hasPdf} onChange={(e) => setHasPdf(e.target.checked)} />
          Endast med PDF
        </label>
      </div>

      <ReportTimeline filters={filters} />
    </div>
  );
}
