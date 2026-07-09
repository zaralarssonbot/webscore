import { PageBody } from "@/components/shared/page-header";
import {
  HeaderSkeleton,
  StatCardsSkeleton,
  SectionHeadingSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <PageBody>
        <StatCardsSkeleton />

        <section className="space-y-4">
          <SectionHeadingSkeleton />
          <div className="rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Skeleton className="hidden size-9 shrink-0 rounded-lg sm:block" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-28 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeadingSkeleton />
          <TableSkeleton rows={6} />
        </section>
      </PageBody>
    </>
  );
}
