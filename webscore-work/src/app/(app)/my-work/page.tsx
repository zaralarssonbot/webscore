import Link from "next/link";
import { requireSession } from "@/lib/auth";
import {
  workOrdersForUser,
  getCustomer,
  listNotifications,
} from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { workOrderStatus } from "@/lib/status";
import { timeAgo, cn } from "@/lib/utils";
import {
  MapPin,
  Clock,
  ChevronRight,
  ClipboardList,
  Bell,
} from "lucide-react";
import type { BadgeColor, WorkOrder } from "@/lib/types";

const accentBar: Record<BadgeColor, string> = {
  gray: "bg-status-gray-fg/40",
  blue: "bg-status-blue-fg",
  violet: "bg-status-violet-fg",
  cyan: "bg-status-cyan-fg",
  amber: "bg-status-amber-fg",
  green: "bg-status-green-fg",
  red: "bg-status-red-fg",
};

function WoCard({ wo, featured }: { wo: WorkOrder; featured?: boolean }) {
  const customer = getCustomer(wo.customerId);
  const meta = workOrderStatus[wo.status];
  return (
    <Link href={`/my-work/${wo.id}`} className="block active:scale-[0.99]">
      <Card
        className={cn(
          "relative flex items-center gap-3 overflow-hidden p-4 transition-[box-shadow,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-sm",
          featured && "ring-1 ring-primary/30"
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", accentBar[meta.color])} />
        <div className="ml-1 flex w-14 shrink-0 flex-col items-center rounded-lg bg-accent py-2 text-accent-foreground">
          <span className="text-sm font-bold">{wo.startTime ?? "—"}</span>
          <span className="text-[10px] opacity-70">{wo.estimatedEndTime}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{wo.title}</p>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {customer?.name}
          </p>
          <div className="mt-1.5">
            <StatusBadge meta={meta} />
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  );
}

function Section({
  title,
  items,
  icon: Icon,
  featured,
}: {
  title: string;
  items: WorkOrder[];
  icon: typeof Clock;
  featured?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" /> {title}
      </h2>
      <div className="space-y-2.5">
        {items.map((w) => (
          <WoCard key={w.id} wo={w} featured={featured} />
        ))}
      </div>
    </section>
  );
}

export default async function MyWorkPage() {
  const { user } = await requireSession();
  const today = new Date().toISOString().slice(0, 10);
  const mine = workOrdersForUser(user.id).filter(
    (w) => !["completed", "invoiced"].includes(w.status)
  );

  const inProgress = mine.filter((w) =>
    ["in_progress", "paused"].includes(w.status)
  );
  const todays = mine.filter(
    (w) => w.date?.slice(0, 10) === today && !inProgress.includes(w)
  );
  const upcoming = mine
    .filter((w) => (w.date?.slice(0, 10) ?? "") > today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const notes = listNotifications(user.id).slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Hej ${user.name.split(" ")[0]}`}
        description="Dina arbeten idag och framåt."
      />
      <PageBody className="mx-auto max-w-2xl">
        {mine.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="Inga aktiva arbeten"
            description="Du har inga tilldelade arbetsorder just nu."
          />
        )}

        {mine.length > 0 && (
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {[
              { label: "Pågår", value: inProgress.length, tone: "text-status-blue-fg" },
              { label: "Idag", value: todays.length, tone: "text-foreground" },
              { label: "Kommande", value: upcoming.length, tone: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="bg-card px-3 py-3.5 text-center">
                <p className={cn("text-2xl font-bold leading-none tracking-tight tabular-nums", s.tone)}>
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <Section title="Pågår nu" items={inProgress} icon={Clock} featured />
        <Section title="Idag" items={todays} icon={ClipboardList} />
        <Section title="Kommande" items={upcoming} icon={Clock} />

        {notes.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
              <Bell className="size-4" /> Notiser
            </h2>
            <Card className="divide-y divide-border p-0">
              {notes.map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? "#"}
                  className="block px-4 py-3 hover:bg-muted/50"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {timeAgo(n.createdAt)}
                  </p>
                </Link>
              ))}
            </Card>
          </section>
        )}
      </PageBody>
    </>
  );
}
