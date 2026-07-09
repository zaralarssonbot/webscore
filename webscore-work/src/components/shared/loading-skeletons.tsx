import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable loading-skeleton primitives that mirror the real page chrome
 * (PageHeader, StatCard grid, list toolbars, tables and side panels) so each
 * route's `loading.tsx` reads as a faithful, low-noise placeholder of itself.
 * Layout-only — no data, no logic.
 */

export function HeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 md:py-6 lg:px-8">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-[80vw]" />
      </div>
      {action && <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
        >
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="mt-4 h-3.5 w-24" />
          <Skeleton className="mt-2 h-7 w-20" />
          <Skeleton className="mt-2.5 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SectionHeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64 max-w-[70vw]" />
    </div>
  );
}

export function ListToolbarSkeleton({ button = false }: { button?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-9 w-56 rounded-lg" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
        {button && <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="ml-auto h-3.5 w-20" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListCardSkeleton({
  title = true,
  rows = 5,
}: {
  title?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
      {title && <Skeleton className="h-5 w-40" />}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <Skeleton className="h-3.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
