import Link from "next/link";
import { requireCapability, can } from "@/lib/auth";
import { listQuotes, customerName, quoteValue } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuotesClient } from "@/components/quotes/quotes-client";
import { Plus } from "lucide-react";

export default async function QuotesPage() {
  const { user } = await requireCapability(can.backoffice);
  const quotes = listQuotes().map((q) => ({
    id: q.id,
    number: q.number,
    title: q.title,
    customer: customerName(q.customerId),
    value: quoteValue(q),
    status: q.status,
    createdAt: q.createdAt,
    validUntil: q.validUntil,
  }));

  return (
    <>
      <PageHeader
        title="Offerter"
        description="Skapa, skicka och följ upp offerter genom hela pipelinen."
        actions={
          can.createQuotes(user.role) ? (
            <Button asChild>
              <Link href="/quotes/new">
                <Plus className="size-4" /> Ny offert
              </Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        <QuotesClient quotes={quotes} />
      </PageBody>
    </>
  );
}
