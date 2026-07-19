"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";
import { EChart, C, vGrad, tooltip } from "./echart";

/** Diverging column chart — P/L per bucket, green up / red down from zero. */
export function ColumnChart({
  title,
  question,
  buckets,
  emptyLabel = "Not enough data yet.",
}: {
  title: string;
  question?: string;
  buckets: Bucket[];
  emptyLabel?: string;
}) {
  const option = {
    grid: { left: 2, right: 6, top: 12, bottom: 2, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(20,24,31,0.04)" } },
      formatter: (ps: { data: { b: Bucket } }[]) => {
        const b = ps[0].data.b;
        const col = b.pnl >= 0 ? C.pos : C.neg;
        return `<div style="font-weight:700">${b.label}</div>
          <div style="color:${C.inkSoft}">${b.trades} trades · ${b.winRate}% win</div>
          <div style="color:${col};font-weight:700;margin-top:2px">${usd(b.pnl, { sign: true })}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: buckets.map((b) => b.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.inkFaint, fontSize: 11, fontWeight: 600 },
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
        barWidth: "52%",
        data: buckets.map((b) => {
          const pos = b.pnl >= 0;
          return {
            value: b.pnl,
            b,
            itemStyle: {
              color: vGrad(pos ? C.pos : C.neg),
              borderRadius: pos ? [5, 5, 0, 0] : [0, 0, 5, 5],
            },
          };
        }),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: C.inkFaint, opacity: 0.4, type: "dashed", width: 1 },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <div className="text-[13px] font-semibold text-ink">{title}</div>
      {question && <div className="mt-0.5 text-[11.5px] text-ink-faint">{question}</div>}
      {buckets.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">{emptyLabel}</div>
      ) : (
        <EChart option={option} height={190} />
      )}
    </SurfaceCard>
  );
}
