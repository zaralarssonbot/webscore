import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Star, ShieldCheck, Play, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scoreColor } from "@/lib/score-color";
import ScoreGauge from "@/components/ScoreGauge";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useEntitlements } from "@/hooks/useEntitlements";
import { retentionSince } from "@/lib/billing/entitlements-service";
import { getDomain, updateDomain, setPrimaryDomain } from "@/lib/account/domain-service";
import { listReports } from "@/lib/account/history-service";
import { analyzeAndSave } from "@/lib/account/analyze";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/lib/account/types";
import TrendCharts from "@/components/app/TrendCharts";
import VerificationPanel from "@/components/app/VerificationPanel";
import ReportTimeline from "@/components/app/ReportTimeline";

export default function DomainDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: domain, isLoading } = useQuery({
    queryKey: ["domain", id],
    queryFn: () => getDomain(id),
    enabled: !!id,
  });

  const { data: latest } = useQuery({
    queryKey: ["domain-latest", id],
    queryFn: async () => (await listReports({ domainId: id }, null, 1)).items[0] ?? null,
    enabled: !!id,
  });
  const { data: ent } = useEntitlements();

  useDocumentMeta({ title: domain ? `${domain.normalized_domain} – Webscore` : "Domän – Webscore", noindex: true });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["domain", id] });
    qc.invalidateQueries({ queryKey: ["domains"] });
    qc.invalidateQueries({ queryKey: ["trend", id] });
    qc.invalidateQueries({ queryKey: ["domain-latest", id] });
  };

  const runAnalysis = async () => {
    if (!domain) return;
    setAnalyzing(true);
    toast.loading("Analyserar…", { id: "an" });
    const reportId = await analyzeAndSave(domain.normalized_domain);
    setAnalyzing(false);
    refresh();
    if (reportId) { toast.success("Analysen är klar", { id: "an" }); navigate(`/analys/${reportId}`); }
    else toast.error("Analysen misslyckades", { id: "an" });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64 rounded" /><Skeleton className="h-64 rounded-xl" /></div>;
  }
  if (!domain) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="text-sm text-muted-foreground mb-4">Domänen hittades inte.</p>
        <Button asChild variant="outline"><Link to="/app/domains"><ArrowLeft className="w-4 h-4 mr-1" />Till domäner</Link></Button>
      </div>
    );
  }

  const color = typeof domain.latest_score === "number" ? scoreColor(domain.latest_score) : null;

  return (
    <div className="space-y-6">
      <Link to="/app/domains" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Domäner
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display">{domain.display_name || domain.normalized_domain}</h1>
            {domain.verified && <ShieldCheck className="w-5 h-5 text-score-high" />}
          </div>
          <p className="text-sm text-muted-foreground">{domain.normalized_domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Favorit"
            onClick={async () => { await updateDomain(domain.id, { is_favorite: !domain.is_favorite }); refresh(); }}>
            <Star className={`w-4 h-4 ${domain.is_favorite ? "fill-neon-cyan text-neon-cyan" : ""}`} />
          </Button>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}Analysera nu
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="trends">Trender</TabsTrigger>
          <TabsTrigger value="history">Historik</TabsTrigger>
          <TabsTrigger value="settings">Inställningar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {!domain.verified && <VerificationPanel domain={domain} onChanged={refresh} />}
          {latest ? (
            <div className="card-surface p-6 flex flex-col sm:flex-row items-center gap-8">
              <ScoreGauge value={latest.final_score} size={140} accent="score" caption="Senaste betyg" />
              <div className="flex-1 w-full space-y-2">
                {CATEGORY_KEYS.map((k) => {
                  const v = latest.category_scores?.[k];
                  const c = typeof v === "number" ? scoreColor(v) : scoreColor(50);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-xs w-32 shrink-0 text-muted-foreground">{CATEGORY_LABELS[k]}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: c.hsl }} />
                      </div>
                      <span className="text-xs w-8 text-right" style={{ color: c.hsl }}>{typeof v === "number" ? v : "—"}</span>
                    </div>
                  );
                })}
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/analys/${latest.id}`}><ExternalLink className="w-4 h-4 mr-1" />Öppna full rapport</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-surface p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">Ingen analys ännu för den här domänen.</p>
              <Button onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}Analysera nu
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendCharts domainId={domain.id} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ReportTimeline filters={{ domainId: domain.id, from: retentionSince(ent?.limits.history_days) ?? undefined }} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-4">
          <VerificationPanel domain={domain} onChanged={refresh} />
          {!domain.is_primary && (
            <Button variant="outline" onClick={async () => { await setPrimaryDomain(domain.id); toast.success("Primär domän uppdaterad"); refresh(); }}>
              Ange som primär domän
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
