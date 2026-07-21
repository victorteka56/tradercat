import { Skeleton, ChartSkeleton } from "@/components/analytics/loaders";

/** Shown instantly while the server fetches trades for the analytics page. */
export default function Loading() {
  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1000px] lg:pt-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Analytics
        </h1>
        <Skeleton className="h-9 w-52 rounded-full" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px]" />
        ))}
      </div>

      <Skeleton className="mb-4 h-[300px]" />

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} height={i < 2 ? 120 : 200} />
        ))}
      </div>
    </main>
  );
}
