import { cn } from "@/lib/utils";

/**
 * Zero-dependency inline SVG sparkline. Renders a smooth-ish line + soft area
 * fill from a numeric series. Purely presentational — safe in server components.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
  stroke = "currentColor",
  fill = "currentColor",
  fillOpacity = 0.14,
  strokeWidth = 2,
  showDot = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  showDot?: boolean;
}) {
  const n = data.length;
  if (n === 0) return null;

  const pad = strokeWidth + 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const x = (i: number) => pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad + innerH - ((v - min) / span) * innerH;

  const points = data.map((v, i) => `${x(i)},${y(v)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(n - 1)},${height - pad} L ${x(0)},${height - pad} Z`;
  const lastX = x(n - 1);
  const lastY = y(data[n - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      fill="none"
      aria-hidden
    >
      <path d={area} fill={fill} fillOpacity={fillOpacity} stroke="none" />
      <path
        d={line}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <>
          <circle cx={lastX} cy={lastY} r={strokeWidth + 1.5} fill={stroke} fillOpacity={0.18} />
          <circle cx={lastX} cy={lastY} r={strokeWidth} fill={stroke} />
        </>
      )}
    </svg>
  );
}
