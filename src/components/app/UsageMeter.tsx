import { scoreColor } from "@/lib/score-color";

/** Used/limit meter. limit null = unlimited (no bar, just the count). */
export default function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  // Reuse the semantic palette inverted: high usage = warmer.
  const color = pct >= 90 ? scoreColor(20) : pct >= 80 ? scoreColor(60) : scoreColor(85);
  return (
    <div className="card-surface p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">
          {used}
          {unlimited ? <span className="text-muted-foreground"> / ∞</span> : <span className="text-muted-foreground"> / {limit}</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color.hsl }} />
        </div>
      )}
    </div>
  );
}
