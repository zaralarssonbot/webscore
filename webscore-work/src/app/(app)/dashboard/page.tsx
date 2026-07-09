import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, can } from "@/lib/auth";
import {
  dashboardMetrics,
  listWorkOrders,
  listQuotes,
  listActivity,
  quoteMonthlyValues,
  quoteOutcomeSplit,
  customerName,
  quoteValue,
} from "@/lib/queries";
import { PageBody } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { Sparkline } from "@/components/shared/sparkline";
import {
  AttentionQueue,
  type AttentionItem,
} from "@/components/shared/attention-queue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuoteValueChart, OutcomeChart } from "@/components/charts/charts";
import { workOrderStatus, quoteStatus } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import {
  Inbox,
  Target,
  Hammer,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  AlertTriangle,
  FilePlus2,
  UserPlus,
  ClipboardPlus,
  Eye,
  PencilRuler,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const { user } = await requireSession();
  if (user.role === "worker") redirect("/my-work");
  const m = dashboardMetrics();
  const today = new Date().toISOString().slice(0, 10);
  const firstName = user.name.split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const todays = listWorkOrders()
    .filter((w) => w.date?.slice(0, 10) === today)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const overdue = listWorkOrders().filter(
    (w) =>
      w.date &&
      w.date.slice(0, 10) < today &&
      !["completed", "invoiced"].includes(w.status)
  );

  const monthly = quoteMonthlyValues();
  const outcome = quoteOutcomeSplit();
  const activity = listActivity().slice(0, 8);

  // ---- Pulse readouts (real data, no fabrication) ----
  const series = monthly.map((mo) => mo.value);
  const curVal = monthly.at(-1)?.value ?? 0;
  const prevVal = monthly.at(-2)?.value ?? 0;
  const momPct =
    prevVal > 0
      ? Math.round(((curVal - prevVal) / prevVal) * 100)
      : curVal > 0
        ? 100
        : 0;
  const momUp = curVal >= prevVal;
  const decided = outcome.approved + outcome.declined;
  const winRate = decided > 0 ? Math.round((outcome.approved / decided) * 100) : 0;

  // ---- Attention queue (control-center triage) ----
  const quotes = listQuotes();
  const opened = quotes.filter((q) => q.status === "opened");
  const changeReq = quotes.filter((q) => q.status === "change_requested");
  const oldestOverdue = [...overdue].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "")
  )[0];

  const attention: AttentionItem[] = [
    overdue.length > 0 && {
      id: "overdue",
      icon: AlertTriangle,
      label: `${overdue.length} försenade arbetsorder`,
      meta: oldestOverdue
        ? `Äldsta förfaller ${formatDate(oldestOverdue.date)}`
        : undefined,
      value: String(overdue.length),
      tone: "red" as const,
      href: "/work-orders",
      priority: 100,
    },
    m.newInquiries > 0 && {
      id: "inquiries",
      icon: Inbox,
      label: `${m.newInquiries} nya förfrågningar att kontakta`,
      meta: "Svara snabbt – chansen att vinna sjunker med tiden",
      value: String(m.newInquiries),
      tone: "blue" as const,
      href: "/inquiries",
      priority: 85,
    },
    changeReq.length > 0 && {
      id: "change",
      icon: PencilRuler,
      label: `${changeReq.length} offerter med ändringsönskemål`,
      meta: "Kunden vill justera – bollen ligger hos dig",
      value: String(changeReq.length),
      tone: "amber" as const,
      href: "/quotes",
      priority: 75,
    },
    opened.length > 0 && {
      id: "opened",
      icon: Eye,
      label: `${opened.length} öppnade offerter att följa upp`,
      meta: "Kunden har tittat men inte svarat",
      value: String(opened.length),
      tone: "violet" as const,
      href: "/quotes",
      priority: 65,
    },
    m.unbilled > 0 && {
      id: "unbilled",
      icon: Receipt,
      label: "Redo att fakturera",
      meta: "Slutfört arbete som ännu inte fakturerats",
      value: formatSEK(m.unbilled),
      tone: "green" as const,
      href: "/invoices",
      priority: 50,
    },
  ].filter(Boolean) as AttentionItem[];

  const quickActions = [
    can.createQuotes(user.role) && {
      href: "/quotes/new",
      label: "Ny offert",
      icon: FilePlus2,
    },
    { href: "/work-orders/new", label: "Ny arbetsorder", icon: ClipboardPlus },
    { href: "/inquiries", label: "Ny förfrågan", icon: Inbox },
    { href: "/customers", label: "Ny kund", icon: UserPlus },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Inbox }[];

  return (
    <>
      {/* Command deck — the cockpit */}
      <div className="px-4 pt-5 md:px-6 md:pt-6 lg:px-8">
        <div className="bg-brand-mesh relative overflow-hidden rounded-2xl text-white shadow-md">
          <div className="relative z-10 grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12.5px] font-medium uppercase tracking-wider text-white/55">
                <span className="inline-flex size-1.5 rounded-full bg-status-green-fg shadow-[0_0_0_3px] shadow-[color:var(--status-green-fg)]/20" />
                {dateLabel}
              </p>
              <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight md:text-[32px]">
                Hej {firstName}, här är dagens affärsläge
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/75">
                {attention.length > 0
                  ? `${attention.length} ${attention.length === 1 ? "sak" : "saker"} kräver din uppmärksamhet idag. ${m.activeWorkCount} jobb är i drift just nu.`
                  : `Allt flyter på. ${m.activeWorkCount} jobb i drift och inget akut väntar.`}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {can.createQuotes(user.role) ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-[color:var(--brand-strong)] shadow-sm hover:bg-white/90"
                  >
                    <Link href="/quotes/new">
                      <FilePlus2 className="size-4" /> Skapa offert
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-[color:var(--brand-strong)] shadow-sm hover:bg-white/90"
                  >
                    <Link href="/work-orders/new">
                      <ClipboardPlus className="size-4" /> Ny arbetsorder
                    </Link>
                  </Button>
                )}
                {quickActions.slice(1).map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-medium text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <a.icon className="size-4" /> {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Pulse panel — live readout */}
            <div className="w-full rounded-xl bg-white/[0.08] p-5 ring-1 ring-inset ring-white/15 backdrop-blur-sm lg:w-[300px]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  Offertvärde · denna månad
                </p>
                <TrendingUp className="size-4 text-white/45" />
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-3">
                <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums">
                  {formatSEK(curVal)}
                </p>
                <span
                  className={`mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    momUp
                      ? "bg-status-green-fg/20 text-white"
                      : "bg-status-red-fg/25 text-white"
                  }`}
                >
                  {momUp ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {momPct > 0 ? "+" : ""}
                  {momPct}%
                </span>
              </div>
              <Sparkline
                data={series}
                width={260}
                height={40}
                className="mt-3 w-full text-white"
                stroke="white"
                fill="white"
                fillOpacity={0.16}
              />
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3.5">
                <div>
                  <p className="text-[11px] text-white/55">Vinstgrad</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {winRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-white/55">Jobb i drift</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {m.activeWorkCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageBody className="pt-7">
        {/* Stat row */}
        <section className="space-y-4">
          <SectionHeading
            title="Affärsläget i siffror"
            description="Nyckeltal för försäljning och leverans just nu"
          />
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Nya förfrågningar"
              value={m.newInquiries}
              icon={Inbox}
              tone="blue"
              href="/inquiries"
              hint="Att kontakta"
            />
            <StatCard
              label="Offerter att vinna"
              value={m.awaitingQuotesCount}
              icon={Target}
              tone="violet"
              href="/quotes"
              hint="Skickade & öppnade"
            />
            <StatCard
              label="Jobb i drift"
              value={m.activeWorkCount}
              icon={Hammer}
              tone="cyan"
              href="/work-orders"
              hint="Aktiva arbetsorder"
            />
            <StatCard
              label="Redo att fakturera"
              value={formatSEK(m.unbilled)}
              icon={Receipt}
              tone="green"
              href="/invoices"
              hint="Uppskattat värde"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: attention + today + follow-ups */}
          <div className="space-y-6 lg:col-span-2">
            <AttentionQueue items={attention} />

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Dagens jobb</CardTitle>
                  <CardDescription>{formatDate(today)}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/calendar">
                    Kalender <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {todays.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Inga arbetsorder schemalagda idag.
                  </p>
                )}
                {todays.map((w) => (
                  <Link
                    key={w.id}
                    href={`/work-orders/${w.id}`}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-accent py-1.5 text-accent-foreground">
                      <span className="text-xs font-bold">
                        {w.startTime ?? "—"}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {w.estimatedEndTime ?? ""}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{w.title}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {customerName(w.customerId)}
                      </p>
                    </div>
                    <StatusBadge meta={workOrderStatus[w.status]} />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offerter att följa upp</CardTitle>
                <CardDescription>
                  Skickade eller öppnade offerter som väntar på svar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {m.awaitingQuotes.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Inga offerter väntar på svar.
                  </p>
                )}
                {m.awaitingQuotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.number} · {customerName(q.customerId)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatSEK(quoteValue(q))}
                    </span>
                    <StatusBadge meta={quoteStatus[q.status]} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: activity */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Senaste aktiviteter</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={activity} />
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <section className="space-y-4">
          <SectionHeading
            title="Insikter"
            description="Trender och utfall över tid"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Offertvärde per månad</CardTitle>
                <CardDescription>Senaste 6 månaderna</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tracking-tight tabular-nums">
                  {formatSEK(monthly.reduce((s, mo) => s + mo.value, 0))}
                </p>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                    momUp
                      ? "bg-status-green-bg text-status-green-fg"
                      : "bg-status-red-bg text-status-red-fg"
                  }`}
                >
                  {momUp ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {momPct > 0 ? "+" : ""}
                  {momPct}% mot förra
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <QuoteValueChart data={monthly} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Offertutfall</CardTitle>
              <CardDescription>Godkända vs. avböjda</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <OutcomeChart
                data={[
                  {
                    name: "Godkända",
                    value: outcome.approved,
                    color: "var(--color-chart-5)",
                  },
                  {
                    name: "Väntar",
                    value: outcome.pending,
                    color: "var(--color-chart-1)",
                  },
                  {
                    name: "Avböjda",
                    value: outcome.declined,
                    color: "var(--color-destructive)",
                  },
                ]}
              />
            </CardContent>
          </Card>
          </div>
        </section>
      </PageBody>
    </>
  );
}
