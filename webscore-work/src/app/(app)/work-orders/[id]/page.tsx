import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, can } from "@/lib/auth";
import {
  getWorkOrder,
  getCustomer,
  getProject,
  getUser,
  userName,
  timeForWorkOrder,
  materialsForWorkOrder,
  attachmentsForWorkOrder,
} from "@/lib/queries";
import { materialSummary } from "@/lib/calc";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { WorkOrderStatusControl } from "@/components/work/status-control";
import { Checklist } from "@/components/work/checklist";
import { TimeTracker } from "@/components/work/time-tracker";
import { MaterialForm } from "@/components/work/material-form";
import { ImageUploader } from "@/components/work/image-uploader";
import { ChangeOrderForm } from "@/components/work/change-order-form";
import { TimeEntryActions } from "@/components/work/time-entry-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRing } from "@/components/shared/progress-ring";
import { InfoList, InfoItem } from "@/components/shared/info-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeEntryStatus, priorityMeta } from "@/lib/status";
import {
  formatDate,
  formatDuration,
  formatSEK,
  initials,
} from "@/lib/utils";
import {
  Pencil,
  Navigation,
  Users,
  Clock,
  CheckCircle2,
  Package,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

function WoMetric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-lg font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;
  const wo = getWorkOrder(id);
  if (!wo) notFound();

  const customer = getCustomer(wo.customerId);
  const project = wo.projectId ? getProject(wo.projectId) : undefined;
  const supervisor = getUser(wo.supervisorId);
  const assignees = wo.assigneeIds.map((aid) => getUser(aid)).filter(Boolean);
  const time = timeForWorkOrder(wo.id);
  const materials = materialsForWorkOrder(wo.id);
  const matSum = materialSummary(materials);
  const attachments = attachmentsForWorkOrder(wo.id).map((a) => ({
    id: a.id,
    url: a.url,
    fileName: a.fileName,
    category: a.category,
    comment: a.comment,
    uploadedBy: userName(a.uploadedBy),
    createdAt: a.createdAt,
  }));
  const totalMinutes = time
    .filter((t) => t.status !== "rejected")
    .reduce((s, t) => s + t.minutes, 0);
  const myRunning = time.find(
    (t) => t.userId === user.id && t.status === "running" && t.startedAt
  );
  const canApprove = can.approveTime(user.role);
  const showFinancials = can.backoffice(user.role);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(wo.address)}`;
  const checklistDone = wo.checklist.filter((c) => c.done).length;
  const checklistTotal = wo.checklist.length;
  const checklistPct = checklistTotal
    ? Math.round((checklistDone / checklistTotal) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={wo.title}
        description={`${wo.number} · ${customer?.name ?? ""}`}
        actions={
          showFinancials ? (
            <Button variant="outline" asChild>
              <Link href={`/work-orders/${wo.id}/edit`}>
                <Pencil className="size-4" /> Redigera
              </Link>
            </Button>
          ) : null
        }
      >
        <div className="mt-3">
          <WorkOrderStatusControl id={wo.id} status={wo.status} />
        </div>
      </PageHeader>

      <PageBody>
        {/* Job vitals — instant situational awareness on the most-used screen */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          <WoMetric
            icon={Clock}
            label="Tid loggad"
            value={formatDuration(totalMinutes)}
          />
          <WoMetric
            icon={CheckCircle2}
            label="Checklista"
            value={checklistTotal ? `${checklistPct}%` : "—"}
            sub={checklistTotal ? `${checklistDone}/${checklistTotal} klara` : "Inga punkter"}
          />
          {showFinancials ? (
            <WoMetric
              icon={Package}
              label="Materialvärde"
              value={formatSEK(matSum.revenue)}
              sub={`${materials.length} rader`}
            />
          ) : (
            <WoMetric
              icon={Users}
              label="Personal"
              value={assignees.length}
              sub={assignees.length === 1 ? "tilldelad" : "tilldelade"}
            />
          )}
          <WoMetric
            icon={CalendarDays}
            label="Schemalagt"
            value={wo.date ? formatDate(wo.date) : "Ej planerad"}
            sub={wo.startTime ? `${wo.startTime}–${wo.estimatedEndTime}` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Översikt</TabsTrigger>
                <TabsTrigger value="time">Tid ({time.length})</TabsTrigger>
                <TabsTrigger value="material">
                  Material ({materials.length})
                </TabsTrigger>
                <TabsTrigger value="photos">
                  Bilder ({attachments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Beskrivning</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {wo.description || "Ingen beskrivning."}
                    </p>
                    {wo.instructions && (
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Instruktioner
                        </p>
                        <p className="mt-1 text-sm">{wo.instructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Checklista</CardTitle>
                      {wo.checklist.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {wo.checklist.filter((c) => c.done).length} av{" "}
                          {wo.checklist.length} klara
                        </p>
                      )}
                    </div>
                    {wo.checklist.length > 0 && (
                      <ProgressRing
                        value={
                          (wo.checklist.filter((c) => c.done).length /
                            wo.checklist.length) *
                          100
                        }
                        size={48}
                        strokeWidth={5}
                        arcClassName="stroke-status-green-fg"
                      >
                        <span className="text-[11px] font-bold tabular-nums">
                          {Math.round(
                            (wo.checklist.filter((c) => c.done).length /
                              wo.checklist.length) *
                              100
                          )}
                          %
                        </span>
                      </ProgressRing>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Checklist workOrderId={wo.id} items={wo.checklist} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="time" className="space-y-4">
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Tidrapporter</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Totalt {formatDuration(totalMinutes)}
                      </p>
                    </div>
                    <TimeTracker workOrderId={wo.id} running={myRunning ? { id: myRunning.id, startedAt: myRunning.startedAt! } : null} />
                  </CardHeader>
                  <CardContent className="divide-y divide-border p-0">
                    {time.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Ingen tid registrerad ännu.
                      </p>
                    )}
                    {time.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span
                          className="flex size-8 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: getUser(t.userId)?.color }}
                        >
                          {initials(userName(t.userId))}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {t.workType}{" "}
                            <span className="text-muted-foreground">
                              · {formatDuration(t.minutes)}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userName(t.userId)} · {formatDate(t.date)}
                            {t.comment ? ` · ${t.comment}` : ""}
                          </p>
                        </div>
                        <StatusBadge meta={timeEntryStatus[t.status]} />
                        {canApprove && t.status === "submitted" && (
                          <TimeEntryActions entryId={t.id} />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="material" className="space-y-4">
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Material</CardTitle>
                    <MaterialForm workOrderId={wo.id} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {materials.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Inget material registrerat.
                      </p>
                    ) : (
                      <>
                        <div className="divide-y divide-border">
                          {materials.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-3 py-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{m.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {m.quantity} {m.unit}
                                  {m.supplier ? ` · ${m.supplier}` : ""}
                                </p>
                              </div>
                              <span className="text-sm tabular-nums">
                                {formatSEK(m.quantity * m.customerPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {showFinancials && (
                          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Inköp
                              </p>
                              <p className="font-medium tabular-nums">
                                {formatSEK(matSum.purchase)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Kundpris
                              </p>
                              <p className="font-medium tabular-nums">
                                {formatSEK(matSum.revenue)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Marginal
                              </p>
                              <p className="font-medium tabular-nums text-status-green-fg">
                                {formatSEK(matSum.margin)} ({matSum.marginPct}%)
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos">
                <Card>
                  <CardHeader>
                    <CardTitle>Bilddokumentation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUploader
                      workOrderId={wo.id}
                      projectId={wo.projectId}
                      attachments={attachments}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detaljer</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoList>
                  <InfoItem label="Adress">{wo.address}</InfoItem>
                  {customer?.phone && (
                    <InfoItem label="Telefon">
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-primary hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </InfoItem>
                  )}
                  <InfoItem label="Tid">
                    {wo.date ? formatDate(wo.date) : "Ej planerad"}
                    {wo.startTime && ` · ${wo.startTime}–${wo.estimatedEndTime}`}
                  </InfoItem>
                  <InfoItem label="Arbetsledare">
                    {supervisor?.name ?? "—"}
                  </InfoItem>
                  {project && (
                    <InfoItem label="Projekt">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-primary hover:underline"
                      >
                        {project.name}
                      </Link>
                    </InfoItem>
                  )}
                  <InfoItem label="Prioritet">
                    <Badge variant={priorityMeta[wo.priority].color}>
                      {priorityMeta[wo.priority].label}
                    </Badge>
                  </InfoItem>
                </InfoList>
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <Navigation className="size-4" /> Navigera dit
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tilldelad personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ingen personal tilldelad.
                  </p>
                )}
                {assignees.map((a) => (
                  <div key={a!.id} className="flex items-center gap-2.5">
                    <span
                      className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: a!.color }}
                    >
                      {initials(a!.name)}
                    </span>
                    <span className="text-sm">{a!.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {project && showFinancials && (
              <Card>
                <CardHeader>
                  <CardTitle>Tilläggsarbete</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Behövs extra arbete utöver offerten?
                  </p>
                  <ChangeOrderForm
                    projectId={project.id}
                    workOrderId={wo.id}
                    trigger={
                      <Button variant="outline" className="w-full">
                        Skapa tilläggsarbete
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
