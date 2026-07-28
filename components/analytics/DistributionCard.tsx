"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { DistBucket } from "@/lib/analysis/analytics";
import { EChart, C, PALETTE, vGrad, tooltip, barShadow, emphasisBar } from "./echart";

/** Histogram of per-trade P/L — the shape of your outcomes, losses left. */
export function DistributionCard({ buckets }: { buckets: DistBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;

  const option = {
    grid: { left: 2, right: 6, top: 20, bottom: 2, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(20,24,31,0.04)" } },
      formatter: (ps: { data: { d: DistBucket } }[]) => {
        const d = ps[0].data.d;
        return `<div style="font-weight:700">${d.label}</div>
          <div style="color:${C.inkSoft}">${d.count} trades · ${Math.round((d.count / total) * 100)}%</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: buckets.map((b) => b.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.inkFaint, fontSize: 9.5, interval: 0 },
    },
    yAxis: {
      type: "value",
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        type: "bar",
        barWidth: "64%",
        itemStyle: { ...barShadow },
        emphasis: emphasisBar,
        data: buckets.map((b) => ({
          value: b.count,
          d: b,
          itemStyle: {
            color: vGrad(PALETTE.teal),
            borderRadius: [6, 6, 0, 0],
          },
        })),
        label: {
          show: true,
          position: "top",
          color: C.inkSoft,
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <div className="text-[13px] font-semibold text-ink">P/L distribution</div>
      <div className="mt-0.5 text-[11.5px] text-ink-faint">
        How your trades cluster — losses left, wins right.
      </div>
      <EChart option={option} height={210} />
    </SurfaceCard>
  );
}
