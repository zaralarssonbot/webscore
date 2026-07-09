import { TrendingUp, Wallet, Layers, Award } from "lucide-react";
import { requireCapability, can } from "@/lib/auth";
import { ProgressRing } from "@/components/shared/progress-ring";
import {
  listQuotes,
  listTimeEntries,
  listUsers,
  listCustomers,
  quoteMonthlyValues,
  quoteOutcomeSplit,
  dashboardMetrics,
  materialMarginSummary,
  quoteValue,
} from "@/lib/queries";
import { formatSEK, formatDuration, formatNumber } from "@/lib/utils";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutcomeChart } from "@/components/charts/charts";
import { SekBarChart } from "./sek-bar-chart";

export default async function ReportsPage() {
  await requireCapability(can.backoffice);

  const quotes = listQuotes();
  const monthly = quoteMonthlyValues();
  const outcome = quoteOutcomeSplit();
  const metrics = dashboardMetrics();
  const material = materialMarginSummary();

  // Conversion rate: approved / (quotes that have been sent or further).
  const sentOrMore = quotes.filter((q) =>
    ["sent", "opened", "change_requested", "approved", "declined", "expired"].includes(
      q.status
    )
  ).length;
  const approvedCount = quotes.filter((q) => q.status === "approved").length;
  const conversion = sentOrMore > 0 ? (approvedCount / sentOrMore) * 100 : 0;
  const approvedValue = quotes
    .filter((q) => q.status === "approved")
    .reduce((s, q) => s + quoteValue(q), 0);

  // Worked time per user.
  const byUser = new Map<string, number>();
  for (const t of listTimeEntries()) {
    byUser.set(t.userId, (byUser.get(t.userId) ?? 0) + t.minutes);
  }
  const userTime = listUsers()
    .map((u) => ({ user: u, minutes: byUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes);

  // Revenue per customer (approved quotes).
  const byCustomer = new Map<string, number>();
  for (const q of quotes.filter((q) => q.status === "approved")) {
    byCustomer.set(
      q.customerId,
      (byCustomer.get(q.customerId) ?? 0) + quoteValue(q)
    );
  }
  const revenuePerCustomer = listCustomers()
    .map((c) => ({ label: c.name, value: byCustomer.get(c.id) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        title="Rapporter"
        description="Nyckeltal för offerter, fakturering, material och arbetad tid."
      />
      <PageBody>
        {/* Headline — conversion gauge (the report's signature metric) */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:gap-8">
            <ProgressRing value={conversion} size={104} strokeWidth={9}>
              <span className="text-[26px] font-bold leading-none tracking-tight tabular-nums">
                {formatNumber(conversion, 0)}%
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                vinst
              </span>
            </ProgressRing>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-muted-foreground">
                Konverteringsgrad
              </p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight">
                {approvedCount} av {sentOrMore} skickade offerter vanns
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Godkända", value: outcome.approved, color: "bg-status-green-fg" },
                  { label: "Väntar", value: outcome.pending, color: "bg-status-blue-fg" },
                  { label: "Avböjda", value: outcome.declined, color: "bg-status-red-fg" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${s.color}`} />
                      <span className="text-xs text-muted-foreground">
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Award}
            label="Godkänt offertvärde"
            value={formatSEK(approvedValue)}
            hint={`${approvedCount} vunna offerter`}
          />
          <KpiCard
            icon={Wallet}
            label="Ej fakturerat"
            value={formatSEK(metrics.unbilled)}
            hint="Uppskattat värde i pågående projekt"
          />
          <KpiCard
            icon={Layers}
            label="Materialmarginal"
            value={formatSEK(material.margin)}
            hint={`${formatNumber(material.marginPct, 0)}% marginal`}
          />
          <KpiCard
            icon={TrendingUp}
            label="Materialintäkt"
            value={formatSEK(material.revenue)}
            hint={`Inköp ${formatSEK(material.purchase)}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Offertvärde per månad</CardTitle>
              <CardDescription>Senaste 6 månaderna</CardDescription>
            </CardHeader>
            <CardContent>
              <SekBarChart data={monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Godkända / avböjda offerter</CardTitle>
              <CardDescription>Utfall för alla offerter</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <OutcomeChart
                data={[
                  {
                    name: "Godkända",
                    value: outcome.approved,
                    color: "var(--color-chart-3)",
                  },
                  {
                    name: "Väntar",
                    value: outcome.pending,
                    color: "var(--color-chart-1)",
                  },
                  {
                    name: "Avböjda",
                    value: outcome.declined,
                    color: "var(--color-chart-5)",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Worked time per employee */}
          <Card>
            <CardHeader>
              <CardTitle>Arbetad tid per medarbetare</CardTitle>
              <CardDescription>Registrerad tid totalt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userTime.map(({ user, minutes }) => {
                const max = userTime[0]?.minutes || 1;
                const pct = max > 0 ? (minutes / max) * 100 : 0;
                return (
                  <div key={user.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{user.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatDuration(minutes)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: user.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Revenue per customer */}
          <Card>
            <CardHeader>
              <CardTitle>Intäkt per kund</CardTitle>
              <CardDescription>Summa godkända offerter</CardDescription>
            </CardHeader>
            <CardContent>
              {revenuePerCustomer.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Inga godkända offerter än.
                </p>
              ) : (
                <div className="space-y-2">
                  {revenuePerCustomer.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                    >
                      <span className="truncate">{r.label}</span>
                      <span className="font-medium tabular-nums">
                        {formatSEK(r.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
