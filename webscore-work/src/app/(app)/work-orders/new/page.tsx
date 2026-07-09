import { requireCapability, can } from "@/lib/auth";
import { listCustomers, listProjects, listUsers } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/components/work/work-order-form";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; customer?: string }>;
}) {
  await requireCapability(can.planWorkOrders);
  const { project, customer } = await searchParams;

  const users = listUsers();
  return (
    <>
      <PageHeader
        title="Ny arbetsorder"
        description="Skapa en arbetsorder och tilldela personal."
      />
      <PageBody>
        <WorkOrderForm
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
          defaults={{ projectId: project, customerId: customer }}
        />
      </PageBody>
    </>
  );
}
