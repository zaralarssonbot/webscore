import Link from "next/link";
import { initials, timeAgo } from "@/lib/utils";
import type { ActivityLog } from "@/lib/types";

export function ActivityFeed({ items }: { items: ActivityLog[] }) {
  if (items.length === 0)
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Ingen aktivitet ännu
      </p>
    );
  return (
    <ul className="space-y-1">
      {items.map((a) => {
        const row = (
          <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
              {initials(a.actorName)}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{a.actorName}</span>{" "}
              <span className="text-muted-foreground">{a.action}</span>
              <p className="text-xs text-muted-foreground/70">
                {timeAgo(a.createdAt)}
              </p>
            </div>
          </div>
        );
        return (
          <li key={a.id}>
            {a.href ? <Link href={a.href}>{row}</Link> : row}
          </li>
        );
      })}
    </ul>
  );
}
