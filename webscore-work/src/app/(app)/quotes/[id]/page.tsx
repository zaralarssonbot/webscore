import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability, can } from "@/lib/auth";
import { getQuote, getCustomer } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { QuotePreview } from "@/components/quotes/quote-preview";
import { QuoteStatusTimeline } from "@/components/quotes/quote-status-timeline";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { InfoList, InfoItem } from "@/components/shared/info-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quoteTotals } from "@/lib/calc";
import { quoteStatus } from "@/lib/status";
import { formatDate, formatDateTime, formatSEK } from "@/lib/utils";
import { Pencil, Printer, MessageSquare } from "lucide-react";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, organization } = await requireCapability(can.backoffice);
  const canManage = can.createQuotes(user.role);
  const { id } = await params;
  const quote = getQuote(id);
  if (!quote) notFound();
  const customer = getCustomer(quote.customerId);
  const totals = quoteTotals(quote.items);

  return (
    <>
      <PageHeader
        title={quote.title}
        description={`${quote.number} · ${customer?.name ?? ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/quotes/${quote.id}/print`} target="_blank">
                <Printer className="size-4" /> PDF
              </Link>
            </Button>
            {quote.status === "draft" && canManage && (
              <Button variant="outline" asChild>
                <Link href={`/quotes/${quote.id}/edit`}>
                  <Pencil className="size-4" /> Redigera
                </Link>
              </Button>
            )}
          </>
        }
      >
        <div className="mt-3">
          <StatusBadge meta={quoteStatus[quote.status]} />
        </div>
      </PageHeader>

      <PageBody>
        <QuoteActions
          quoteId={quote.id}
          token={quote.publicToken}
          status={quote.status}
          projectId={quote.projectId}
          canManage={canManage}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuotePreview quote={quote} customer={customer} org={organization} />
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="bg-brand-mesh px-5 py-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Offertvärde
                </p>
                <p className="mt-1 text-[30px] font-bold leading-none tracking-tight tabular-nums">
                  {formatSEK(totals.total)}
                </p>
                <p className="mt-1.5 text-xs text-white/70">
                  {formatSEK(totals.subtotal)} exkl. moms ·{" "}
                  {quote.pricingType === "fixed" ? "Fast pris" : "Uppskattat"}
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
                  <InfoItem label="Offertnr">{quote.number}</InfoItem>
                  <InfoItem label="Skapad">{formatDate(quote.createdAt)}</InfoItem>
                  <InfoItem label="Giltig till">
                    {formatDate(quote.validUntil)}
                  </InfoItem>
                  <InfoItem label="Prissättning">
                    {quote.pricingType === "fixed" ? "Fast pris" : "Uppskattat"}
                  </InfoItem>
                  {quote.paymentTerms && (
                    <InfoItem label="Betalningsvillkor">
                      {quote.paymentTerms}
                    </InfoItem>
                  )}
                </InfoList>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteStatusTimeline quote={quote} />
              </CardContent>
            </Card>

            {quote.approvals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Kundsvar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quote.approvals.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{a.name}</span>
                        <StatusBadge
                          meta={
                            a.decision === "approved"
                              ? quoteStatus.approved
                              : a.decision === "declined"
                                ? quoteStatus.declined
                                : quoteStatus.change_requested
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                      {a.comment && (
                        <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="size-4 shrink-0" />
                          {a.comment}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                        <span>{formatDateTime(a.decidedAt)}</span>
                        {a.ipAddress && <span>IP {a.ipAddress}</span>}
                        {a.termsAccepted && (
                          <Badge variant="green">Villkor accepterade</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
