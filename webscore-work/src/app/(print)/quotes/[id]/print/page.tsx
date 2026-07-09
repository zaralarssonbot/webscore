import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getQuote, getCustomer } from "@/lib/queries";
import { QuotePreview } from "@/components/quotes/quote-preview";
import { PrintBar } from "@/components/shared/print-bar";

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const quote = getQuote(id);
  if (!quote) notFound();
  const customer = getCustomer(quote.customerId);

  return (
    <>
      <PrintBar />
      <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
        <QuotePreview
          quote={quote}
          customer={customer}
          org={session.organization}
        />
      </div>
    </>
  );
}
