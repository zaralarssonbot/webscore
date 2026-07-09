import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability, can } from "@/lib/auth";
import {
  getInvoiceDraft,
  getCustomer,
  getProject,
  getWorkOrder,
} from "@/lib/queries";
import { invoiceTotals } from "@/lib/calc";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { InfoList, InfoItem } from "@/components/shared/info-list";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoiceCsvButton } from "@/components/invoices/invoice-csv-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { invoiceDraftStatus } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, organization } = await requireCapability(can.backoffice);
  const canManage = can.createInvoices(user.role);
  const { id } = await params;
  const invoice = getInvoiceDraft(id);
  if (!invoice) notFound();
  const customer = getCustomer(invoice.customerId);
  const project = invoice.projectId ? getProject(invoice.projectId) : undefined;
  const workOrder = invoice.workOrderId
    ? getWorkOrder(invoice.workOrderId)
    : undefined;
  const totals = invoiceTotals(invoice.items);

  return (
    <>
      <PageHeader
        title={`Fakturaunderlag ${invoice.number}`}
        description={customer?.name}
        actions={
          <>
            <InvoiceCsvButton number={invoice.number} items={invoice.items} />
            <Button variant="outline" asChild>
              <Link href={`/invoices/${invoice.id}/print`} target="_blank">
                <Printer className="size-4" /> PDF
              </Link>
            </Button>
          </>
        }
      >
        <div className="mt-3">
          <StatusBadge meta={invoiceDraftStatus[invoice.status]} />
        </div>
      </PageHeader>

      <PageBody>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <InvoiceActions id={invoice.id} status={invoice.status} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InvoicePreview
              invoice={invoice}
              customer={customer}
              org={organization}
            />
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="bg-brand-mesh px-5 py-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Att fakturera
                </p>
                <p className="mt-1 text-[30px] font-bold leading-none tracking-tight tabular-nums">
                  {formatSEK(totals.total)}
                </p>
                <p className="mt-1.5 text-xs text-white/70">
                  {formatSEK(totals.subtotal)} exkl. moms · moms{" "}
                  {formatSEK(totals.vatTotal)}
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detaljer</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoList>
                  <InfoItem label="Kund">{customer?.name ?? "—"}</InfoItem>
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
                  {workOrder && (
                    <InfoItem label="Arbetsorder">
                      <Link
                        href={`/work-orders/${workOrder.id}`}
                        className="text-primary hover:underline"
                      >
                        {workOrder.number}
                      </Link>
                    </InfoItem>
                  )}
                  {invoice.reference && (
                    <InfoItem label="Referens">{invoice.reference}</InfoItem>
                  )}
                  <InfoItem label="Skapad">{formatDate(invoice.createdAt)}</InfoItem>
                  <InfoItem label="Rader">{invoice.items.length}</InfoItem>
                  <InfoItem label="Status">
                    <StatusBadge meta={invoiceDraftStatus[invoice.status]} />
                  </InfoItem>
                </InfoList>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
