import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  getWorkOrder,
  getCustomer,
  getUser,
  timeForWorkOrder,
  materialsForWorkOrder,
  attachmentsForWorkOrder,
  userName,
} from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeTracker } from "@/components/work/time-tracker";
import { Checklist } from "@/components/work/checklist";
import { ImageUploader } from "@/components/work/image-uploader";
import { MaterialForm } from "@/components/work/material-form";
import { CompleteWorkButton } from "@/components/work/complete-work-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { workOrderStatus } from "@/lib/status";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Navigation,
  User,
  Clock,
} from "lucide-react";

export default async function MyWorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;
  const wo = getWorkOrder(id);
  if (!wo) notFound();

  const customer = getCustomer(wo.customerId);
  const supervisor = getUser(wo.supervisorId);
  const time = timeForWorkOrder(wo.id);
  const myRunning = time.find(
    (t) => t.userId === user.id && t.status === "running" && t.startedAt
  );
  const totalMinutes = time
    .filter((t) => t.status !== "rejected")
    .reduce((s, t) => s + t.minutes, 0);
  const attachments = attachmentsForWorkOrder(wo.id).map((a) => ({
    id: a.id,
    url: a.url,
    fileName: a.fileName,
    category: a.category,
    comment: a.comment,
    uploadedBy: userName(a.uploadedBy),
    createdAt: a.createdAt,
  }));
  const materials = materialsForWorkOrder(wo.id);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(wo.address)}`;

  return (
    <>
      <PageHeader title={wo.title} description={`${wo.number} · ${customer?.name ?? ""}`}>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/my-work">
              <ArrowLeft className="size-4" /> Mina arbeten
            </Link>
          </Button>
          <StatusBadge meta={workOrderStatus[wo.status]} />
        </div>
      </PageHeader>

      <PageBody className="mx-auto max-w-2xl">
        {/* Primary action */}
        <Card>
          <CardContent className="pt-5">
            <TimeTracker
              workOrderId={wo.id}
              running={myRunning ? { id: myRunning.id, startedAt: myRunning.startedAt! } : null}
              big
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Registrerad tid totalt: {formatDuration(totalMinutes)}
            </p>
          </CardContent>
        </Card>

        {/* Key info */}
        <Card>
          <CardContent className="space-y-3 pt-5 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{wo.address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-muted-foreground" />
              <span>
                {wo.date ? formatDate(wo.date) : "Ej planerad"}
                {wo.startTime && ` · ${wo.startTime}–${wo.estimatedEndTime}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <User className="size-4 text-muted-foreground" />
              <span>Arbetsledare: {supervisor?.name ?? "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {customer?.phone && (
                <Button variant="outline" asChild className="h-12">
                  <a href={`tel:${customer.phone}`}>
                    <Phone className="size-4" /> Ring kund
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild className="h-12">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" /> Navigera
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {(wo.description || wo.instructions) && (
          <Card>
            <CardHeader>
              <CardTitle>Beskrivning & instruktioner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {wo.description && (
                <p className="text-muted-foreground">{wo.description}</p>
              )}
              {wo.instructions && (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  {wo.instructions}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Checklista</CardTitle>
            {wo.checklist.length > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-secondary-foreground">
                {wo.checklist.filter((c) => c.done).length}/{wo.checklist.length} klara
              </span>
            )}
          </CardHeader>
          <CardContent>
            <Checklist workOrderId={wo.id} items={wo.checklist} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Material</CardTitle>
            <MaterialForm workOrderId={wo.id} />
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inget material registrerat.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {materials.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>
                      {m.name} ({m.quantity} {m.unit})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bilder</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              workOrderId={wo.id}
              projectId={wo.projectId}
              attachments={attachments}
            />
          </CardContent>
        </Card>

        {!["completed", "invoiced", "review"].includes(wo.status) && (
          <CompleteWorkButton workOrderId={wo.id} />
        )}
      </PageBody>
    </>
  );
}
