"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";
import { EChart, C, PALETTE, areaGrad, tooltip } from "./echart";
import { CardHead } from "./CardHead";

/**
 * Trade activity over time — a line of trades per month, each point coloured by
 * whether that month was green or red. Surfaces overtrading and whether busier
 * months actually pay.
 */
export function ActivityChart({ monthly, href }: { monthly: Bucket[]; href?: string }) {
  const option = {
    grid: { left: 2, right: 10, top: 16, bottom: 2, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: C.line } },
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
      boundaryGap: false,
      data: monthly.map((b) => b.label),
      axisLine: { lineStyle: { color: C.line } },
      axisTick: { show: false },
      axisLabel: { color: C.inkFaint, fontSize: 10, interval: monthly.length > 12 ? "auto" : 0 },
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
        type: "line",
        smooth: 0.4,
        symbolSize: 9,
        data: monthly.map((b) => ({
          value: b.trades,
          b,
          itemStyle: { color: b.pnl >= 0 ? C.pos : C.neg, borderColor: C.surface, borderWidth: 2 },
        })),
        lineStyle: {
          color: PALETTE.amber,
          width: 2.5,
          shadowBlur: 10,
          shadowColor: PALETTE.amber + "55",
          shadowOffsetY: 4,
        },
        areaStyle: { color: areaGrad(PALETTE.amber) },
        emphasis: { scale: 1.5, itemStyle: { shadowBlur: 12, shadowColor: "rgba(20,24,31,0.2)" } },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <CardHead
        title="Trade activity"
        question="Trades per month — each point's colour is that month's P/L."
        href={href}
      />
      {monthly.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">No dated trades yet.</div>
      ) : (
        <EChart option={option} height={200} />
      )}
    </SurfaceCard>
  );
}
