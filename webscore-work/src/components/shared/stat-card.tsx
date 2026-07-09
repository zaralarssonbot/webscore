import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type Tone = "blue" | "violet" | "cyan" | "amber" | "green" | "red";

const chip: Record<Tone, string> = {
  blue: "bg-status-blue-bg text-status-blue-fg",
  violet: "bg-status-violet-bg text-status-violet-fg",
  cyan: "bg-status-cyan-bg text-status-cyan-fg",
  amber: "bg-status-amber-bg text-status-amber-fg",
  green: "bg-status-green-bg text-status-green-fg",
  red: "bg-status-red-bg text-status-red-fg",
};

const accent: Record<Tone, string> = {
  blue: "bg-status-blue-fg/70",
  violet: "bg-status-violet-fg/70",
  cyan: "bg-status-cyan-fg/70",
  amber: "bg-status-amber-fg/70",
  green: "bg-status-green-fg/70",
  red: "bg-status-red-fg/70",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone: t = "blue",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone | "primary";
  href?: string;
}) {
  const tone = (t === "primary" ? "blue" : t) as Tone;
  const c = chip[tone];
  const inner = (
    <Card className="group relative overflow-hidden p-5 transition-[box-shadow,border-color,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100",
          accent[tone]
        )}
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            c
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        {href && (
          <ArrowUpRight className="size-4 -translate-x-0.5 text-muted-foreground/40 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-muted-foreground group-hover:opacity-100" />
        )}
      </div>
      <p className="mt-4 text-[13px] font-medium text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[27px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-2 truncate text-xs text-muted-foreground/80">{hint}</p>
      )}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
