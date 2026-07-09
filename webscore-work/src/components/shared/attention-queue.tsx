import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ChevronRight, ShieldCheck, type LucideIcon } from "lucide-react";

export type AttentionTone =
  | "red"
  | "amber"
  | "violet"
  | "blue"
  | "cyan"
  | "green";

export interface AttentionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  meta?: string;
  value: string;
  tone: AttentionTone;
  href: string;
  /** Higher = more urgent. Used for ordering. */
  priority: number;
}

const toneChip: Record<AttentionTone, string> = {
  red: "bg-status-red-bg text-status-red-fg",
  amber: "bg-status-amber-bg text-status-amber-fg",
  violet: "bg-status-violet-bg text-status-violet-fg",
  blue: "bg-status-blue-bg text-status-blue-fg",
  cyan: "bg-status-cyan-bg text-status-cyan-fg",
  green: "bg-status-green-bg text-status-green-fg",
};

const toneRail: Record<AttentionTone, string> = {
  red: "bg-status-red-fg",
  amber: "bg-status-amber-fg",
  violet: "bg-status-violet-fg",
  blue: "bg-status-blue-fg",
  cyan: "bg-status-cyan-fg",
  green: "bg-status-green-fg",
};

/**
 * The control-center triage list: every signal that needs a human decision,
 * ranked by urgency. Empty state means the business is under control.
 */
export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const total = sorted.length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            {total > 0 && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2.5 rounded-full",
                total > 0 ? "bg-primary" : "bg-status-green-fg"
              )}
            />
          </span>
          <h2 className="text-[15px] font-semibold leading-none tracking-tight">
            Kräver din uppmärksamhet
          </h2>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
            {total}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-status-green-bg text-status-green-fg">
            <ShieldCheck className="size-5" />
          </span>
          <p className="text-sm font-medium">Allt är under kontroll</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Inget kräver din åtgärd just nu. Nya förfrågningar och förfallna jobb
            dyker upp här direkt.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {sorted.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group relative flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-muted/50 sm:px-6"
              >
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-[3px] rounded-full opacity-0 transition-opacity group-hover:opacity-100",
                    toneRail[item.tone]
                  )}
                />
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    toneChip[item.tone]
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {item.label}
                  </p>
                  {item.meta && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.meta}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {item.value}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
