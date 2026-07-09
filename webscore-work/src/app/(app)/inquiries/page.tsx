import { requireCapability, can } from "@/lib/auth";
import { listInquiries, listUsers } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { InquiriesBoard, NewInquiryDialog } from "./inquiries-board";

export default async function InquiriesPage() {
  await requireCapability(can.backoffice);
  const inquiries = listInquiries();
  const users = listUsers().map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageHeader
        title="Förfrågningar"
        description="Inkommande förfrågningar från kunder – följ dem från ny till konverterad."
        actions={<NewInquiryDialog users={users} />}
      />
      <PageBody>
        <InquiriesBoard inquiries={inquiries} users={users} />
      </PageBody>
    </>
  );
}
