import { ArrowUp, ArrowDown, Minus } from "lucide-react";

/** Compact coloured delta chip (▲ +5 / ▼ −3 / – 0). */
export default function ScoreDelta({ delta, className = "" }: { delta: number | null; className?: string }) {
  if (delta == null) return <span className={`text-xs text-muted-foreground ${className}`}>–</span>;
  if (delta === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs text-muted-foreground ${className}`}>
        <Minus className="w-3 h-3" />0
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-score-high" : "text-score-low"} ${className}`}>
      <Icon className="w-3 h-3" />
      {up ? "+" : ""}
      {delta}
    </span>
  );
}
