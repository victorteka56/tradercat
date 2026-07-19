"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";
import { EChart, C, vGrad, tooltip } from "./echart";

/**
 * Trade activity over time — how many trades per month, coloured by whether that
 * month was green or red. Surfaces overtrading and shows whether busy months
 * actually pay.
 */
export function ActivityChart({ monthly }: { monthly: Bucket[] }) {
  const option = {
    grid: { left: 2, right: 6, top: 22, bottom: 2, containLabel: true },
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
      data: monthly.map((b) => b.label),
      axisLine: { show: false },
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
        type: "bar",
        barWidth: "56%",
        data: monthly.map((b) => ({
          value: b.trades,
          b,
          itemStyle: {
            color: vGrad(b.pnl >= 0 ? C.pos : C.neg),
            borderRadius: [5, 5, 0, 0],
          },
        })),
        label: { show: monthly.length <= 14, position: "top", color: C.inkSoft, fontSize: 10, fontWeight: 600 },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <div className="text-[13px] font-semibold text-ink">Trade activity</div>
      <div className="mt-0.5 text-[11.5px] text-ink-faint">
        Trades per month — bar colour is that month&apos;s P/L.
      </div>
      {monthly.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">No dated trades yet.</div>
      ) : (
        <EChart option={option} height={180} />
      )}
    </SurfaceCard>
  );
}
