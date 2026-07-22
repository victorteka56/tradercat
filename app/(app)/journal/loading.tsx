import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Skeleton } from "@/components/analytics/loaders";

/** Shown instantly on navigation to the journal while the trades load. */
export default function Loading() {
  return (
    <main className="px-4 pt-14 lg:pt-10">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
            Journal
          </h1>
          <div className="mt-1.5">
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px]" />
        ))}
      </div>

      <div className="mb-4">
        <Skeleton className="h-[92px]" />
      </div>

      <div className="mb-3 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-24 animate-pulse rounded bg-surface-2" />
                <div className="mt-1.5 h-2.5 w-40 animate-pulse rounded bg-surface-2" />
              </div>
              <div className="h-3.5 w-20 animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </SurfaceCard>
    </main>
  );
}
