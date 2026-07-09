import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { requireCapability, can } from "@/lib/auth";
import {
  getProject,
  getQuote,
  customerName,
  userName,
  quoteValue,
  workOrdersForProject,
  changeOrdersForProject,
  timeForWorkOrder,
  workedMinutes,
} from "@/lib/queries";
import {
  workOrderStatus,
  quoteStatus,
  projectStatus,
  changeOrderStatus,
} from "@/lib/status";
import { formatSEK, formatDate, formatDuration } from "@/lib/utils";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRing } from "@/components/shared/progress-ring";
import { InfoList, InfoItem } from "@/components/shared/info-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  CreateChangeOrderDialog,
  CreateInvoiceButton,
} from "./project-actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireCapability(can.backoffice);
  const canInvoice = can.createInvoices(user.role);
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const quote = project.quoteId ? getQuote(project.quoteId) : undefined;
  const workOrders = workOrdersForProject(project.id);
  const changeOrders = changeOrdersForProject(project.id);

  const workedMin = workOrders.reduce(
    (sum, w) => sum + workedMinutes(timeForWorkOrder(w.id)),
    0
  );
  const budgetMin = project.laborBudgetHours * 60;
  const progress =
    budgetMin > 0 ? Math.min(100, Math.round((workedMin / budgetMin) * 100)) : 0;

  return (
    <>
      <PageHeader
        title={project.name}
        description={customerName(project.customerId)}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/work-orders/new?project=${project.id}`}>
                <Plus className="size-4" /> Ny arbetsorder
              </Link>
            </Button>
            <CreateChangeOrderDialog projectId={project.id} />
            {canInvoice && <CreateInvoiceButton projectId={project.id} />}
          </>
        }
      >
        <div className="mt-3">
          <StatusBadge meta={projectStatus[project.status]} />
        </div>
      </PageHeader>

      <PageBody>
        {/* Project vitals — headline numbers in one hairline band */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            { label: "Budget", value: formatSEK(project.budget) },
            { label: "Arbetad tid", value: formatDuration(workedMin) },
            { label: "Budgettimmar", value: `${project.laborBudgetHours} tim` },
            { label: "Materialbudget", value: formatSEK(project.materialBudget) },
          ].map((s) => (
            <div key={s.label} className="bg-card px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Work orders */}
            <Card>
              <CardHeader>
                <CardTitle>Arbetsorder ({workOrders.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workOrders.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Inga arbetsorder kopplade till projektet.
                  </p>
                )}
                {workOrders.map((w) => (
                  <Link
                    key={w.id}
                    href={`/work-orders/${w.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.number} · {formatDate(w.date)}
                      </p>
                    </div>
                    <StatusBadge meta={workOrderStatus[w.status]} />
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Change orders */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Tilläggsarbeten ({changeOrders.length})</CardTitle>
                <CreateChangeOrderDialog projectId={project.id} />
              </CardHeader>
              <CardContent className="space-y-2">
                {changeOrders.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Inga tilläggsarbeten registrerade.
                  </p>
                )}
                {changeOrders.map((co) => (
                  <div
                    key={co.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{co.description}</p>
                        {co.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {co.reason}
                          </p>
                        )}
                      </div>
                      <StatusBadge meta={changeOrderStatus[co.status]} />
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{co.estimatedHours} tim</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatSEK(co.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Arbetad tid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-5">
                  <ProgressRing
                    value={progress}
                    size={88}
                    strokeWidth={8}
                    arcClassName={
                      progress > 100
                        ? "stroke-status-red-fg"
                        : progress >= 85
                          ? "stroke-status-amber-fg"
                          : "stroke-primary"
                    }
                  >
                    <span className="text-base font-bold tabular-nums">
                      {progress}%
                    </span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatDuration(workedMin)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      av {project.laborBudgetHours} tim budgeterat
                    </p>
                  </div>
                </div>
                {quote && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Offertstatus</span>
                      <StatusBadge meta={quoteStatus[quote.status]} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detaljer</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoList>
                  <InfoItem label="Kund">
                    {customerName(project.customerId)}
                  </InfoItem>
                  <InfoItem label="Projektledare">
                    {userName(project.managerId)}
                  </InfoItem>
                  <InfoItem label="Adress">{project.address || "—"}</InfoItem>
                  <InfoItem label="Period">
                    {formatDate(project.startDate)} –{" "}
                    {formatDate(project.endDate)}
                  </InfoItem>
                  {quote && (
                    <InfoItem label="Offert">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="text-primary hover:underline"
                      >
                        {quote.number} · {formatSEK(quoteValue(quote))}
                      </Link>
                    </InfoItem>
                  )}
                </InfoList>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
