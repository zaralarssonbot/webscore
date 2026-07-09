import { PageBody } from "@/components/shared/page-header";
import {
  StatCardsSkeleton,
  SectionHeadingSkeleton,
  ListCardSkeleton,
} from "@/components/shared/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      {/* Command deck banner */}
      <div className="px-4 pt-5 md:px-6 md:pt-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-xs md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-80 max-w-[80vw]" />
            <Skeleton className="h-4 w-96 max-w-[85vw]" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-10 w-36 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
          <div className="w-full space-y-4 rounded-xl border border-border p-5 lg:w-[300px]">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3.5">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
      </div>

      <PageBody className="pt-7">
        <section className="space-y-4">
          <SectionHeadingSkeleton />
          <StatCardsSkeleton />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ListCardSkeleton rows={3} />
            <ListCardSkeleton rows={3} />
          </div>
          <ListCardSkeleton rows={6} />
        </div>

        <section className="space-y-4">
          <SectionHeadingSkeleton />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mx-auto size-40 rounded-full" />
            </div>
          </div>
        </section>
      </PageBody>
    </>
  );
}
