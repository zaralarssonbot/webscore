import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreColor } from "@/lib/score-color";
import { getTrend } from "@/lib/account/trend-service";
import { type RangeKey, RANGE_LABELS, deltaOverRange } from "@/lib/account/trend-utils";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/lib/account/types";
import ScoreDelta from "./ScoreDelta";
import EmptyState from "./EmptyState";

const RANGES: RangeKey[] = ["30d", "90d", "6m", "12m", "all"];

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function TrendCharts({ domainId }: { domainId: string }) {
  const [range, setRange] = useState<RangeKey>("90d");
  const { data: points = [], isLoading } = useQuery({
    queryKey: ["trend", domainId, range],
    queryFn: () => getTrend(domainId, range),
  });

  const overallDelta = deltaOverRange(points);
  const overallColor = points.length ? scoreColor(points[points.length - 1].score) : scoreColor(50);

  const chartData = points.map((p) => ({
    ts: fmtDate(p.ts),
    overall: p.score,
    ...Object.fromEntries(CATEGORY_KEYS.map((k) => [k, p.categories[k] ?? null])),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Poängutveckling</h3>
          <ScoreDelta delta={overallDelta} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                range === r ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : points.length < 2 ? (
        <EmptyState
          icon={TrendingUp}
          title="Behöver minst två analyser"
          description="Kör ytterligare en analys för att se en trend över tid."
        />
      ) : (
        <>
          <div className="card-surface p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="ts" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="overall" name="Totalt" stroke={overallColor.hsl} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORY_KEYS.map((k) => {
              const latest = points[points.length - 1].categories[k];
              const first = points[0].categories[k];
              const cColor = typeof latest === "number" ? scoreColor(latest) : scoreColor(50);
              const cDelta = typeof latest === "number" && typeof first === "number" ? latest - first : null;
              return (
                <div key={k} className="card-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{CATEGORY_LABELS[k]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: cColor.hsl }}>
                        {typeof latest === "number" ? latest : "—"}
                      </span>
                      <ScoreDelta delta={cDelta} />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={48}>
                    <LineChart data={chartData} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                      <YAxis hide domain={[0, 100]} />
                      <Line type="monotone" dataKey={k} stroke={cColor.hsl} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
