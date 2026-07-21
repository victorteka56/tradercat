import { Skeleton, ChartSkeleton } from "@/components/analytics/loaders";

export default function Loading() {
  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[900px] lg:pt-10">
      <Skeleton className="mb-3 h-4 w-24 rounded" />
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-52 rounded-full" />
      </div>
      <div className="mb-4">
        <ChartSkeleton height={200} />
      </div>
      <Skeleton className="h-[300px]" />
    </main>
  );
}
