import { PageBody } from "@/components/shared/page-header";
import {
  HeaderSkeleton,
  ListToolbarSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeletons";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <PageBody>
        <div className="space-y-4">
          <ListToolbarSkeleton button />
          <TableSkeleton rows={8} />
        </div>
      </PageBody>
    </>
  );
}
