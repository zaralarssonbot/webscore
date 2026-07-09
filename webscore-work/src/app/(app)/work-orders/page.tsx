import Link from "next/link";
import { requireCapability, can } from "@/lib/auth";
import { listWorkOrders, customerName, getUser } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WorkOrdersClient } from "@/components/work/work-orders-client";
import { Plus } from "lucide-react";

export default async function WorkOrdersPage() {
  await requireCapability(can.backoffice);
  const rows = listWorkOrders()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((w) => ({
      id: w.id,
      number: w.number,
      title: w.title,
      customer: customerName(w.customerId),
      address: w.address,
      date: w.date,
      startTime: w.startTime,
      status: w.status,
      priority: w.priority,
      assignees: w.assigneeIds
        .map((id) => getUser(id))
        .filter(Boolean)
        .map((u) => ({ name: u!.name, color: u!.color })),
    }));

  return (
    <>
      <PageHeader
        title="Arbetsorder"
        description="Planera, tilldela och följ upp allt arbete."
        actions={
          <Button asChild>
            <Link href="/work-orders/new">
              <Plus className="size-4" /> Ny arbetsorder
            </Link>
          </Button>
        }
      />
      <PageBody>
        <WorkOrdersClient rows={rows} />
      </PageBody>
    </>
  );
}
