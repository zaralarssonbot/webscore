import { PageBody } from "@/components/shared/page-header";
import {
  HeaderSkeleton,
  ListToolbarSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeletons";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton action />
      <PageBody>
        <div className="space-y-4">
          <ListToolbarSkeleton />
          <TableSkeleton rows={8} />
        </div>
      </PageBody>
    </>
  );
}
