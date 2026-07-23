"use client";

import { useMemo, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { RealizedPoint } from "@/lib/queries/journal";
import { RANGES, RANGE_LABEL, windowStart, type RangeKey } from "@/lib/analysis/range";
import { usd, usdCompact } from "@/lib/format";
import { EChart, C, areaGrad, tooltip } from "@/components/analytics/echart";

/**
 * Brokerage-style equity panel. A date-range toggle (24H / 1W / 1M / YTD / ALL)
 * drives a headline "P/L over the window" figure and a cumulative equity chart
 * that reads the account's realized equity *level*, so the window's return is
 * end − start. Hovering the chart reads the equity value at any point.
 *
 * Pass `controlledRange` to drive it from a page-level filter (analytics) — the
 * built-in tabs hide and the window follows the parent.
 */

const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function EquityPanel({
  series,
  title = "Equity curve",
  controlledRange,
}: {
  series: RealizedPoint[];
  title?: string;
  controlledRange?: RangeKey;
}) {
  const [internalRange, setInternalRange] = useState<RangeKey>("ALL");
  const range = controlledRange ?? internalRange;
  const setRange = setInternalRange;
  const showTabs = controlledRange == null;
  const now = useMemo(() => Date.now(), []);

  const model = useMemo(() => {
    const from = windowStart(range, now);
    let baseline = 0;
    const inRange: RealizedPoint[] = [];
    for (const p of series) {
      if (p.t < from) baseline += p.pnl;
      else inRange.push(p);
    }

    // Cumulative equity points: anchor at the window's opening level, then step
    // with each realized trade.
    const anchorT = from === -Infinity ? (series[0]?.t ?? now) : from;
    const pts: [number, number][] = [[anchorT, baseline]];
    let cum = baseline;
    let rangePnl = 0;
    let winners = 0;
    for (const p of inRange) {
      cum += p.pnl;
      rangePnl += p.pnl;
      if (p.pnl > 0) winners++;
      pts.push([p.t, cum]);
    }
    if (range !== "ALL" || pts.length < 2) pts.push([now, cum]);

    const vs = pts.map((p) => p[1]);
    return {
      pts,
      min: Math.min(...vs),
      max: Math.max(...vs),
      rangePnl,
      count: inRange.length,
      winners,
      endEquity: cum,
      startEquity: pts[0][1],
    };
  }, [series, range, now]);

  if (series.length === 0) {
    return (
      <SurfaceCard className="p-4">
        <PanelHeader title={title} range={range} setRange={setRange} showTabs={showTabs} rangePnl={0} count={0} winners={0} />
        <div className="flex h-[140px] items-center justify-center text-[13px] text-ink-faint">
          No realized trades yet.
        </div>
      </SurfaceCard>
    );
  }

  const up = model.endEquity >= model.startEquity;
  const color = up ? C.pos : C.neg;
  const zeroInView = model.min < 0 && model.max > 0;

  const option = {
    grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: C.inkFaint, width: 1, type: "dashed" } },
      formatter: (ps: { data: [number, number] }[]) => {
        const [t, v] = ps[0].data;
        const col = v >= 0 ? C.pos : C.neg;
        return `<div style="color:${C.inkFaint};font-size:11px">${fmtDay(t)}</div>
          <div style="color:${col};font-weight:700;font-size:13px;margin-top:1px">${usd(v, { sign: true })}</div>`;
      },
    },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: C.inkFaint,
        fontSize: 10,
        hideOverlap: true,
        formatter: (val: number) =>
          new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.inkFaint, fontSize: 10, formatter: (v: number) => usdCompact(v) },
      splitLine: { show: true, lineStyle: { color: C.line, type: "dashed", opacity: 0.7 } },
    },
    series: [
      {
        type: "line",
        smooth: 0.26,
        showSymbol: false,
        data: model.pts,
        lineStyle: { color, width: 2.4, shadowBlur: 12, shadowColor: color + "55", shadowOffsetY: 6 },
        areaStyle: { color: areaGrad(color) },
        emphasis: { focus: "series", lineStyle: { width: 2.4 } },
        markLine: zeroInView
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: C.inkFaint, opacity: 0.4, type: "dashed", width: 1 },
              data: [{ yAxis: 0 }],
              label: { show: false },
            }
          : undefined,
        z: 3,
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <PanelHeader title={title} range={range} setRange={setRange} showTabs={showTabs} rangePnl={model.rangePnl} count={model.count} winners={model.winners} />
      <div className="mt-2">
        <EChart option={option} height={200} />
      </div>
    </SurfaceCard>
  );
}

function PanelHeader({
  title,
  range,
  setRange,
  showTabs,
  rangePnl,
  count,
  winners,
}: {
  title: string;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  showTabs: boolean;
  rangePnl: number;
  count: number;
  winners: number;
}) {
  const winRate = count > 0 ? Math.round((winners / count) * 100) : 0;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
          {title} · {RANGE_LABEL[range]}
        </div>
        <div
          className={`tnum mt-1 text-[26px] font-semibold leading-none ${
            count === 0 ? "text-ink-faint" : rangePnl >= 0 ? "text-pos" : "text-neg"
          }`}
        >
          {usd(rangePnl, { sign: true })}
        </div>
        <div className="tnum mt-1.5 text-[11.5px] text-ink-soft">
          {count === 0
            ? "No trades in range"
            : `${count.toLocaleString()} trade${count === 1 ? "" : "s"} · ${winRate}% win`}
        </div>
      </div>

      {showTabs && (
        <div className="flex shrink-0 gap-0.5 rounded-full border border-line bg-surface-2/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                range === r ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
