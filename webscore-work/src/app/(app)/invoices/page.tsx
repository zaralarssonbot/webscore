import Link from "next/link";
import { requireCapability, can } from "@/lib/auth";
import {
  listInvoiceDrafts,
  listProjects,
  customerName,
  getQuote,
  getProject,
  quoteValue,
} from "@/lib/queries";
import { invoiceTotals } from "@/lib/calc";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateInvoiceButton } from "@/components/invoices/create-invoice-button";
import {
  InvoicesClient,
  type InvoiceRow,
} from "@/components/invoices/invoices-client";
import { Card, CardContent } from "@/components/ui/card";
import { formatSEK } from "@/lib/utils";
import { Receipt, Wallet, FileStack, FolderClock } from "lucide-react";

export default async function InvoicesPage() {
  const { user } = await requireCapability(can.backoffice);
  const canCreate = can.createInvoices(user.role);
  const invoices = listInvoiceDrafts();
  const billable = listProjects()
    .filter((p) => p.status !== "invoiced")
    .map((p) => ({ project: p, quote: p.quoteId ? getQuote(p.quoteId) : undefined }));

  const totalAll = invoices.reduce((s, i) => s + invoiceTotals(i.items).total, 0);
  const totalDraft = invoices
    .filter((i) => i.status !== "exported")
    .reduce((s, i) => s + invoiceTotals(i.items).total, 0);

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    customerName: customerName(inv.customerId),
    projectName: inv.projectId ? getProject(inv.projectId)?.name ?? null : null,
    reference: inv.reference,
    createdAt: inv.createdAt,
    total: invoiceTotals(inv.items).total,
    status: inv.status,
  }));

  return (
    <>
      <PageHeader
        title="Fakturaunderlag"
        description="Skapa, godkänn och exportera underlag till ekonomisystemet."
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Underlag totalt"
            value={invoices.length}
            icon={Receipt}
            tone="violet"
            hint="Alla statusar"
          />
          <StatCard
            label="Total summa"
            value={formatSEK(totalAll)}
            icon={FileStack}
            tone="blue"
            hint="Inkl. moms"
          />
          <StatCard
            label="Ej överfört värde"
            value={formatSEK(totalDraft)}
            icon={Wallet}
            tone="amber"
            hint="Väntar på export"
          />
          <StatCard
            label="Fakturerbara projekt"
            value={billable.length}
            icon={FolderClock}
            tone="green"
            hint="Klara att fakturera"
          />
        </div>

        {/* Billable projects — the export entry point */}
        {canCreate && billable.length > 0 && (
          <section className="space-y-4">
            <SectionHeading
              title="Klart att fakturera"
              description="Projekt med arbete redo att bli fakturaunderlag"
            />
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {billable.map(({ project, quote }) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-status-green-bg text-status-green-fg sm:flex">
                      <FolderClock className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {customerName(project.customerId)}
                        {quote ? ` · ${formatSEK(quoteValue(quote))}` : ""}
                      </p>
                    </div>
                    <CreateInvoiceButton projectId={project.id} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Inga fakturaunderlag ännu"
            description="Skapa ett underlag från ett projekt ovan."
          />
        ) : (
          <section className="space-y-4">
            <SectionHeading
              title="Alla underlag"
              description="Utkast, godkända och överförda underlag"
            />
            <InvoicesClient rows={rows} />
          </section>
        )}
      </PageBody>
    </>
  );
}
