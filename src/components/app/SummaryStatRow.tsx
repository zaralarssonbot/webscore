import { Globe, Gauge, TrendingUp, AlertTriangle } from "lucide-react";
import type { Domain } from "@/lib/account/types";

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Globe; label: string; value: string; accent?: string }) {
  return (
    <div className="card-surface p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-neon-cyan" />
      </div>
      <div className="min-w-0">
        <div className={`text-xl font-bold font-display ${accent ?? ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

/** Aggregate KPI row derived purely from the loaded domain list. */
export default function SummaryStatRow({ domains }: { domains: Domain[] }) {
  const scored = domains.filter((d) => typeof d.latest_score === "number") as (Domain & { latest_score: number })[];
  const avg = scored.length ? Math.round(scored.reduce((s, d) => s + d.latest_score, 0) / scored.length) : null;
  const best = scored.length ? Math.max(...scored.map((d) => d.latest_score)) : null;
  const needsAttention = scored.filter((d) => d.latest_score < 50).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat icon={Globe} label="Domäner" value={String(domains.length)} />
      <Stat icon={Gauge} label="Snittpoäng" value={avg == null ? "—" : String(avg)} />
      <Stat icon={TrendingUp} label="Högsta poäng" value={best == null ? "—" : String(best)} />
      <Stat
        icon={AlertTriangle}
        label="Kräver åtgärd"
        value={String(needsAttention)}
        accent={needsAttention > 0 ? "text-score-low" : undefined}
      />
    </div>
  );
}
