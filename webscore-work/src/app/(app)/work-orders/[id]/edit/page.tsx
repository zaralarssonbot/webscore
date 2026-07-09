import { notFound } from "next/navigation";
import { requireCapability, can } from "@/lib/auth";
import {
  getWorkOrder,
  listCustomers,
  listProjects,
  listUsers,
} from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/components/work/work-order-form";

export default async function EditWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability(can.planWorkOrders);
  const { id } = await params;
  const workOrder = getWorkOrder(id);
  if (!workOrder) notFound();

  const users = listUsers();
  return (
    <>
      <PageHeader
        title={`Redigera ${workOrder.number}`}
        description={workOrder.title}
      />
      <PageBody>
        <WorkOrderForm
          workOrder={workOrder}
          customers={listCustomers().map((c) => ({ id: c.id, name: c.name }))}
          projects={listProjects().map((p) => ({
            id: p.id,
            name: p.name,
            customerId: p.customerId,
            address: p.address,
          }))}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            meta: u.title,
            color: u.color,
          }))}
          supervisors={users
            .filter((u) => u.role !== "worker")
            .map((u) => ({ id: u.id, name: u.name }))}
        />
      </PageBody>
    </>
  );
}
