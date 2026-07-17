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
    <SurfaceCard className="p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className={`tnum mt-1.5 text-[22px] font-semibold ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="tnum mt-0.5 text-[12px] text-ink-soft">{sub}</div>}
    </SurfaceCard>
  );
}
