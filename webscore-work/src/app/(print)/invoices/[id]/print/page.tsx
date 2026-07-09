import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvoiceDraft, getCustomer } from "@/lib/queries";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { PrintBar } from "@/components/shared/print-bar";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const invoice = getInvoiceDraft(id);
  if (!invoice) notFound();
  const customer = getCustomer(invoice.customerId);

  return (
    <>
      <PrintBar />
      <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
        <InvoicePreview
          invoice={invoice}
          customer={customer}
          org={session.organization}
        />
      </div>
    </>
  );
}
