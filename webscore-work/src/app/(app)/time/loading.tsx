import { PageBody } from "@/components/shared/page-header";
import {
  HeaderSkeleton,
  StatCardsSkeleton,
  SectionHeadingSkeleton,
  TableSkeleton,
  ListCardSkeleton,
} from "@/components/shared/loading-skeletons";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <PageBody>
        <StatCardsSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeadingSkeleton />
            <TableSkeleton rows={7} />
          </div>
          <div className="space-y-6">
            <ListCardSkeleton rows={5} />
            <ListCardSkeleton rows={5} />
          </div>
        </div>
      </PageBody>
    </>
  );
}
