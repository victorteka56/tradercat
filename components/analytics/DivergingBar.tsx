"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";
import { EChart, C, hGrad, tooltip } from "./echart";
import { CardHead } from "./CardHead";

/**
 * Two-sided P/L: Long and Short as diverging bars from a centre line — losses
 * reach left in red, gains reach right in green, sized by amount.
 */
export function DivergingBar({
  title,
  question,
  left,
  right,
  href,
}: {
  title: string;
  question?: string;
  left?: Bucket;
  right?: Bucket;
  href?: string;
}) {
  // Rows bottom→top on the category axis, so Long sits on top.
  const rows: { label: string; b?: Bucket }[] = [
    { label: right?.label ?? "Short", b: right },
    { label: left?.label ?? "Long", b: left },
  ];
  const maxAbs = Math.max(1, Math.abs(left?.pnl ?? 0), Math.abs(right?.pnl ?? 0));

  const option = {
    grid: { left: 4, right: 4, top: 6, bottom: 6, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: (ps: { data: { b?: Bucket; label: string } }[]) => {
        const r = ps[0].data;
        if (!r.b) return `<b>${r.label}</b><br/><span style="color:${C.inkSoft}">none</span>`;
        const col = r.b.pnl >= 0 ? C.pos : C.neg;
        return `<div style="font-weight:700">${r.b.label}</div>
          <div style="color:${C.inkSoft}">${r.b.trades} trades · ${r.b.winRate}% win</div>
          <div style="color:${col};font-weight:700;margin-top:2px">${usd(r.b.pnl, { sign: true })}</div>`;
      },
    },
    xAxis: {
      type: "value",
      min: -maxAbs,
      max: maxAbs,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.inkSoft, fontWeight: 700, fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 16,
        data: rows.map((r) => {
          const v = r.b?.pnl ?? 0;
          const pos = v >= 0;
          return {
            value: v,
            label: r.label,
            b: r.b,
            itemStyle: {
              color: r.b ? hGrad(pos ? C.pos : C.neg) : C.line,
              borderRadius: pos ? [0, 6, 6, 0] : [6, 0, 0, 6],
            },
          };
        }),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: C.inkFaint, opacity: 0.4, type: "dashed", width: 1 },
          data: [{ xAxis: 0 }],
          label: { show: false },
        },
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <CardHead title={title} question={question} href={href} />

      <div className="mt-3 flex items-end justify-between">
        <Side bucket={left} fallback="Long" align="left" />
        <Side bucket={right} fallback="Short" align="right" />
      </div>

      <EChart option={option} height={104} />
    </SurfaceCard>
  );
}

function Side({
  bucket,
  fallback,
  align,
}: {
  bucket?: Bucket;
  fallback: string;
  align: "left" | "right";
}) {
  const a = align === "left" ? "text-left" : "text-right";
  return (
    <div className={a}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        {bucket?.label ?? fallback}
      </div>
      {bucket ? (
        <div
          className={`tnum text-[16px] font-semibold ${
            bucket.pnl >= 0 ? "text-pos" : "text-neg"
          }`}
        >
          {usd(bucket.pnl, { sign: true })}
        </div>
      ) : (
        <div className="text-[14px] font-semibold text-ink-faint">none</div>
      )}
    </div>
  );
}
