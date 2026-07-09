import { notFound } from "next/navigation";
import { requireCapability, can } from "@/lib/auth";
import { getQuote, listCustomers } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { QuoteEditor } from "@/components/quotes/quote-editor";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireCapability(can.createQuotes);
  const { id } = await params;
  const quote = getQuote(id);
  if (!quote) notFound();

  const customers = listCustomers().map((c) => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    type: c.type,
  }));

  return (
    <>
      <PageHeader
        title={`Redigera ${quote.number}`}
        description={quote.title}
      />
      <PageBody>
        <QuoteEditor
          customers={customers}
          quote={quote}
          defaultTerms={organization.quoteTerms}
          defaultPaymentTerms={organization.paymentTerms}
        />
      </PageBody>
    </>
  );
}
