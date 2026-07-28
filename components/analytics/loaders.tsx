import { SurfaceCard } from "@/components/ui/SurfaceCard";

/** A quiet spinner used while a lazy chart chunk or slow data is loading. */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-ink-faint ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Card-shaped placeholder shown while a chart's code/data loads in. */
export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <SurfaceCard className="p-4">
      <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
      <div className="mt-1.5 h-2.5 w-40 animate-pulse rounded bg-surface-2" />
      <div className="flex items-center justify-center" style={{ height }}>
        <Spinner />
      </div>
    </SurfaceCard>
  );
}

/** A plain shimmer block (KPI tiles, equity, etc.). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}
