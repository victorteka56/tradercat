import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Skeleton, Spinner } from "@/components/analytics/loaders";

/**
 * Shown instantly when a trade is opened, while the chart data and review load.
 * Mirrors the real layout so the swap to content doesn't jump.
 */
export default function Loading() {
  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1160px] lg:pt-10">
      <div className="mb-3 inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-soft">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Journal
      </div>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-56 rounded-lg" />
          <div className="mt-2">
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <div className="mt-2">
            <Skeleton className="h-2.5 w-14 rounded" />
          </div>
        </div>
      </div>

      {/* Analysis launcher placeholder */}
      <Skeleton className="mb-4 h-[70px] rounded-2xl" />

      {/* Chart (left) + stats (right), matching the mosaic */}
      <div className="lg:flex lg:items-start lg:gap-5">
        <div className="min-w-0 lg:flex-[1.7]">
          <SurfaceCard className="mb-4 p-4">
            <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
            <div className="mt-1.5 h-2.5 w-48 animate-pulse rounded bg-surface-2" />
            <div
              className="mt-3 flex items-center justify-center rounded-xl"
              style={{ height: 320, background: "#111621" }}
            >
              <Spinner className="h-7 w-7" />
            </div>
          </SurfaceCard>
        </div>

        <div className="min-w-0 lg:flex-1">
          <SurfaceCard className="mb-4 divide-y divide-line px-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="h-2.5 w-20 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </SurfaceCard>
        </div>
      </div>
    </main>
  );
}
