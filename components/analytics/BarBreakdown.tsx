"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd, usdCompact } from "@/lib/format";
import { EChart, C, hGrad, tooltip, barShadow, emphasisBar } from "./echart";
import { CardHead } from "./CardHead";

/** Ranked horizontal P/L bars — labels on the axis, values at the bar ends. */
export function BarBreakdown({
  title,
  question,
  buckets,
  emptyLabel = "Not enough data yet.",
  href,
}: {
  title: string;
  question?: string;
  buckets: Bucket[];
  emptyLabel?: string;
  href?: string;
}) {
  // Category axis renders bottom→top, so reverse to read top-down.
  const rows = [...buckets].reverse();

  const option = {
    grid: { left: 4, right: 48, top: 6, bottom: 2, containLabel: true },
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
      type: "value",
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: rows.map((b) => b.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.ink, fontSize: 12, fontWeight: 600 },
    },
    series: [
      {
        type: "bar",
        barWidth: rows.length > 6 ? 10 : 15,
        itemStyle: { ...barShadow },
        emphasis: emphasisBar,
        data: rows.map((b) => {
          const pos = b.pnl >= 0;
          return {
            value: b.pnl,
            b,
            itemStyle: {
              color: hGrad(pos ? C.pos : C.neg),
              borderRadius: pos ? [0, 6, 6, 0] : [6, 0, 0, 6],
            },
          };
        }),
        label: {
          show: true,
          position: "right",
          formatter: (p: { data: { value: number } }) => usdCompact(p.data.value),
          color: C.inkSoft,
          fontSize: 11,
          fontWeight: 600,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: C.inkFaint, opacity: 0.35, type: "dashed", width: 1 },
          data: [{ xAxis: 0 }],
          label: { show: false },
        },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <CardHead title={title} question={question} href={href} />
      {buckets.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">{emptyLabel}</div>
      ) : (
        <EChart option={option} height={Math.max(130, rows.length * 34 + 24)} />
      )}
    </SurfaceCard>
  );
}
