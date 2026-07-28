import { SurfaceCard } from "./SurfaceCard";

export function MetricCard({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "pos" | "neg" | "info";
}) {
  const toneClass =
    tone === "pos"
      ? "text-pos"
      : tone === "neg"
      ? "text-neg"
      : tone === "info"
      ? "text-info"
      : "text-ink";
  return (
    <SurfaceCard className="p-4 lg:p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        {label}
      </div>
      <div className={`tnum mt-2 text-[23px] font-bold leading-none tracking-[-0.01em] ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="tnum mt-1.5 text-[12px] font-medium text-ink-soft">{sub}</div>}
    </SurfaceCard>
  );
}
