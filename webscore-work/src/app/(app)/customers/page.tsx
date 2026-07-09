import { requireCapability, can } from "@/lib/auth";
import { quotesForCustomer, projectsForCustomer } from "@/lib/queries";
import { listCustomers } from "@/lib/data/customers";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  await requireCapability(can.backoffice);
  const customers = (await listCustomers()).map((c) => ({
    ...c,
    quoteCount: quotesForCustomer(c.id).length,
    projectCount: projectsForCustomer(c.id).length,
  }));

  return (
    <>
      <PageHeader
        title="Kunder"
        description="Privatpersoner och företag du arbetar med."
      />
      <PageBody>
        <CustomersClient customers={customers} />
      </PageBody>
    </>
  );
}
