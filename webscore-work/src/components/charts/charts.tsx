"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSEK, formatNumber } from "@/lib/utils";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickMargin: 8,
};

function TooltipBox({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          {p.color && (
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
            />
          )}
          {p.name}:{" "}
          <span className="font-medium text-foreground">
            {format ? format(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function PeakDot(props: {
  cx?: number;
  cy?: number;
  value?: number;
  peak?: number;
}) {
  const { cx, cy, value, peak } = props;
  if (cx == null || cy == null || value !== peak || !peak) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--color-chart-1)" opacity={0.18} />
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill="var(--color-card)"
        stroke="var(--color-chart-1)"
        strokeWidth={2}
      />
    </g>
  );
}

export function QuoteValueChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const peak = Math.max(...data.map((d) => d.value), 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="qv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          vertical={false}
          stroke="var(--color-border)"
          strokeOpacity={0.7}
        />
        <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          {...axis}
          tickFormatter={(v) => `${formatNumber(v / 1000)}k`}
        />
        <Tooltip
          content={<TooltipBox format={(v) => formatSEK(v)} />}
          cursor={{ stroke: "var(--color-border)" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="Offertvärde"
          stroke="var(--color-chart-1)"
          strokeWidth={2.5}
          fill="url(#qv)"
          dot={<PeakDot peak={peak} />}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OutcomeChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width={150} height={150}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={3}
              cornerRadius={4}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none tracking-tight tabular-nums">
            {total}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            offerter
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ background: d.color }}
            />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-medium tabular-nums">{d.value}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-border pt-2 text-sm">
          <span className="text-muted-foreground">Totalt</span>
          <span className="ml-auto font-semibold tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  );
}

export function SimpleBarChart({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          vertical={false}
          stroke="var(--color-border)"
          strokeOpacity={0.7}
        />
        <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} />
        <YAxis tickLine={false} axisLine={false} width={48} {...axis} />
        <Tooltip
          content={<TooltipBox format={format} />}
          cursor={{ fill: "var(--color-muted)" }}
        />
        <Bar
          dataKey="value"
          name="Värde"
          fill="var(--color-chart-1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
