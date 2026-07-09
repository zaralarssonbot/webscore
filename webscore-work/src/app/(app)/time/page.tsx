import Link from "next/link";
import { requireCapability, can } from "@/lib/auth";
import {
  listTimeEntries,
  getUser,
  getWorkOrder,
  userName,
  listUsers,
} from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import {
  TimeEntriesClient,
  type TimeRow,
} from "@/components/work/time-entries-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, initials } from "@/lib/utils";
import { Clock, CheckCircle2, Hourglass, XCircle } from "lucide-react";

function startOfWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export default async function TimePage() {
  const { user } = await requireCapability(can.backoffice);
  const entries = listTimeEntries().sort((a, b) => b.date.localeCompare(a.date));
  const canApprove = can.approveTime(user.role);

  const weekStart = startOfWeek().toISOString().slice(0, 10);
  const weekMinutes = entries
    .filter((e) => e.date >= weekStart && e.status !== "rejected")
    .reduce((s, e) => s + e.minutes, 0);
  const pending = entries.filter((e) => e.status === "submitted");
  const approvedMinutes = entries
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.minutes, 0);
  const rejected = entries.filter((e) => e.status === "rejected");

  // Per-user totals
  const perUser = listUsers()
    .map((u) => ({
      user: u,
      minutes: entries
        .filter((e) => e.userId === u.id && e.status !== "rejected")
        .reduce((s, e) => s + e.minutes, 0),
    }))
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  // Per-work-order totals
  const woMap = new Map<string, { number: string; title: string; minutes: number }>();
  for (const e of entries) {
    if (e.status === "rejected") continue;
    const wo = getWorkOrder(e.workOrderId);
    if (!wo) continue;
    const prev = woMap.get(wo.id) ?? { number: wo.number, title: wo.title, minutes: 0 };
    prev.minutes += e.minutes;
    woMap.set(wo.id, prev);
  }
  const perWorkOrder = [...woMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);

  const rows: TimeRow[] = entries.map((e) => {
    const wo = getWorkOrder(e.workOrderId);
    return {
      id: e.id,
      userName: userName(e.userId),
      userColor: getUser(e.userId)?.color ?? "#888",
      woId: wo?.id ?? null,
      woNumber: wo?.number ?? null,
      workType: e.workType,
      date: e.date,
      minutes: e.minutes,
      status: e.status,
    };
  });

  return (
    <>
      <PageHeader
        title="Tidrapporter"
        description="Registrerad tid, godkännanden och summeringar."
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Denna vecka"
            value={formatDuration(weekMinutes)}
            icon={Clock}
            tone="blue"
            hint="Mån–sön, exkl. avvisat"
          />
          <StatCard
            label="Väntar på godkännande"
            value={pending.length}
            icon={Hourglass}
            tone="amber"
            hint="Inskickade poster"
          />
          <StatCard
            label="Godkänd tid"
            value={formatDuration(approvedMinutes)}
            icon={CheckCircle2}
            tone="green"
            hint="Klar för fakturering"
          />
          <StatCard
            label="Avvisad tid"
            value={rejected.length}
            icon={XCircle}
            tone="red"
            hint="Behöver korrigeras"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeading
              title="Tidsposter"
              description="Granska och godkänn registrerad tid"
            />
            <TimeEntriesClient rows={rows} canApprove={canApprove} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tid per medarbetare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {perUser.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ingen registrerad tid ännu.
                  </p>
                )}
                {perUser.map((r) => (
                  <div key={r.user.id} className="flex items-center gap-3">
                    <span
                      className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: r.user.color }}
                    >
                      {initials(r.user.name)}
                    </span>
                    <span className="flex-1 truncate text-sm">{r.user.name}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatDuration(r.minutes)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tid per arbetsorder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {perWorkOrder.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ingen registrerad tid ännu.
                  </p>
                )}
                {perWorkOrder.map((w) => (
                  <Link
                    key={w.id}
                    href={`/work-orders/${w.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.title}</p>
                      <p className="text-xs text-muted-foreground">{w.number}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatDuration(w.minutes)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
