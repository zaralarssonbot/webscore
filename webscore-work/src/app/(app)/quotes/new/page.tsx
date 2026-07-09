import { requireCapability, can } from "@/lib/auth";
import { listCustomers } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { QuoteEditor } from "@/components/quotes/quote-editor";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { organization } = await requireCapability(can.createQuotes);
  const { customer } = await searchParams;
  const customers = listCustomers().map((c) => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    type: c.type,
  }));

  return (
    <>
      <PageHeader
        title="Ny offert"
        description="Skapa en offert med rader, automatiska beräkningar och villkor."
      />
      <PageBody>
        <QuoteEditor
          customers={customers}
          defaultCustomerId={customer}
          defaultTerms={organization.quoteTerms}
          defaultPaymentTerms={organization.paymentTerms}
        />
      </PageBody>
    </>
  );
}
