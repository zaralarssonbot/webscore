import { cn } from "@/lib/utils";

/**
 * Webscore Work brand mark — a "score ring": a calibrated gauge track with a
 * filled arc and a reading dot at its leading edge. Reads as measurement /
 * score, which is the heart of the Webscore identity.
 */
export function WebscoreMark({
  size = 24,
  className,
  /** Stroke/fill colour. On the brand tile this is white. */
  color = "currentColor",
  trackOpacity = 0.32,
}: {
  size?: number;
  className?: string;
  color?: string;
  trackOpacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* track */}
      <circle
        cx="12"
        cy="12"
        r="8.4"
        stroke={color}
        strokeOpacity={trackOpacity}
        strokeWidth="2.4"
      />
      {/* score arc — ~72% sweep, starts at top */}
      <circle
        cx="12"
        cy="12"
        r="8.4"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="72 100"
        transform="rotate(-90 12 12)"
      />
      {/* reading dot */}
      <circle cx="12" cy="12" r="2.3" fill={color} />
    </svg>
  );
}

/** Brand mark inside a rounded brand tile. */
export function Logo({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
    >
      <WebscoreMark size={size * 0.62} color="currentColor" />
    </span>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo size={30} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">
          Webscore
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Work
        </span>
      </span>
    </span>
  );
}
