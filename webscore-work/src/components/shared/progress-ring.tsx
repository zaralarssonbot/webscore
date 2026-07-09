import { cn } from "@/lib/utils";

/**
 * A precise circular progress gauge (pure SVG, no deps).
 * Subtle premium detail — used for completion %, budget burn, conversion.
 */
export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 5,
  className,
  trackClassName,
  arcClassName,
  children,
}: {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  arcClassName?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn("stroke-border", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(
            "stroke-primary [transition:stroke-dashoffset_0.7s_cubic-bezier(0.32,0.72,0,1)]",
            arcClassName
          )}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
