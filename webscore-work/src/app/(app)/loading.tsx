import { PageBody } from "@/components/shared/page-header";
import { HeaderSkeleton } from "@/components/shared/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Neutral app-wide loading fallback. Route segments with their own
 * `loading.tsx` override this with a layout-specific skeleton; this generic
 * header + content placeholder covers everything else without implying a
 * particular page shape.
 */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <PageBody>
        <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-xs">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
