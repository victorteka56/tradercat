"use client";

import { useMemo, useState } from "react";
import {
  EChart,
  C,
  tooltip,
  hGrad,
  barShadow,
  emphasisBar,
} from "@/components/analytics/echart";
import { usd } from "@/lib/format";

/**
 * The portfolio's two charts.
 *
 * Allocation answers "where is my money", P/L answers "what is it doing" — so
 * allocation uses the categorical palette (a slice's colour is an identity, not
 * a judgement) while P/L uses green/red, where the colour carries the meaning.
 */

export interface ChartHolding {
  id: string;
  label: string;
  marketValue: number | null;
  costBasis: number | null;
  unrealizedPnl: number | null;
}

/** One allocation slice: an asset class, or cash. */
export interface AllocationSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1000) return `$${(a / 1000).toFixed(1)}k`;
  return a < 10 ? `$${a.toFixed(2)}` : `$${Math.round(a)}`;
};

/* ------------------------------ allocation ------------------------------ */

/**
 * Allocation as individual positions, grouped and coloured by asset class.
 *
 * The ring is one slice per holding — that's the detail worth seeing — but hue
 * carries the asset class and lightness separates positions within it, so the
 * ring still reads as "mostly options" without a legend lookup. Unrelated
 * colours per holding would show the same data and tell no story.
 *
 * Slices above a threshold get a leader label; the rest stay clean and are
 * covered by the legend and the holdings table. The centre is the readout,
 * quiet until a slice is hovered.
 */

/** Below this share a leader label collides with its neighbours more than it informs. */
const LABEL_MIN_PCT = 4;

export function AllocationDonut({
  ring,
  legend,
  height = 210,
}: {
  ring: AllocationSlice[];
  legend: AllocationSlice[];
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  const total = ring.reduce((sum, d) => sum + d.value, 0);

  const data = useMemo(
    () =>
      ring.map((s) => {
        const share = total > 0 ? (s.value / total) * 100 : 0;
        const labelled = share >= LABEL_MIN_PCT;
        return {
          name: s.label,
          value: s.value,
          itemStyle: { color: s.color },
          label: { show: labelled },
          labelLine: { show: labelled },
        };
      }),
    [ring, total],
  );

  const shown = active != null ? ring[active] : null;

  const option = useMemo(
    () => ({
      tooltip: { show: false },
      series: [
        {
          type: "pie",
          radius: ["50%", "70%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          minAngle: 0,
          padAngle: 1.2,
          itemStyle: {
            borderRadius: 6,
            borderColor: C.surface,
            borderWidth: 2,
            shadowBlur: 14,
            shadowColor: "rgba(20,24,31,0.10)",
            shadowOffsetY: 4,
          },
          label: {
            position: "outside",
            formatter: (p: { name: string; percent: number }) =>
              `{t|${p.name}}\n{v|${p.percent.toFixed(1)}%}`,
            rich: {
              t: { color: C.ink, fontSize: 11.5, fontWeight: 700, lineHeight: 14 },
              v: { color: C.inkSoft, fontSize: 11, fontWeight: 500, lineHeight: 13 },
            },
          },
          labelLine: {
            length: 10,
            length2: 12,
            smooth: true,
            lineStyle: { color: C.line, width: 1 },
          },
          emphasis: {
            focus: "self",
            scale: true,
            scaleSize: 6,
            itemStyle: { shadowBlur: 24, shadowColor: "rgba(20,24,31,0.22)" },
          },
          blur: { itemStyle: { opacity: 0.3 }, label: { opacity: 0.35 } },
          data,
        },
      ],
    }),
    [data],
  );

  if (ring.length === 0) return null;

  return (
    <div>
      <div className="relative">
        <EChart
          option={option}
          height={height}
          onEvents={{
            mouseover: (p: never) => setActive((p as { dataIndex: number }).dataIndex),
            globalout: () => setActive(null),
          }}
        />
        {/* The idle centre is a chart annotation, not a second headline — the
            total is already stated on the value card, so it stays quiet until a
            slice is hovered and the readout earns its weight. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="max-w-[46%] truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            {shown ? shown.label : "Total"}
          </div>
          <div
            className={`tnum tracking-tight ${
              shown
                ? "text-[18px] font-semibold text-ink"
                : "text-[15px] font-medium text-ink-soft"
            }`}
          >
            {usd(shown ? shown.value : total)}
          </div>
          {shown && total > 0 && (
            <div className="tnum text-[11px] font-medium text-ink-soft">
              {((shown.value / total) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Class totals beneath the per-holding ring — the summary the slices add up to. */}
      <div className="mt-3 border-t border-line pt-2">
        {legend.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5 px-1 py-1">
            <span
              className="h-2 w-2 shrink-0 rounded-[3px]"
              style={{ background: s.color }}
            />
            <span className="flex-1 truncate text-[12.5px] font-medium text-ink">
              {s.label}
            </span>
            <span className="tnum text-[12.5px] font-semibold text-ink">
              {usd(s.value)}
            </span>
            <span className="tnum w-11 text-right text-[11.5px] text-ink-faint">
              {total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- unrealized P/L ---------------------------- */

/**
 * Open P/L per position as diverging bars from a shared zero line, so winners
 * and losers are comparable at a glance and the biggest drag is obvious.
 */
export function UnrealizedChart({ holdings }: { holdings: ChartHolding[] }) {
  const rows = useMemo(
    () =>
      holdings
        .filter((h) => h.unrealizedPnl != null)
        .sort((a, b) => (a.unrealizedPnl as number) - (b.unrealizedPnl as number)),
    [holdings],
  );

  const option = useMemo(() => {
    const names = rows.map((r) => r.label);
    const vals = rows.map((r) => r.unrealizedPnl as number);
    // Bound each side by what's actually there. A fixed symmetric range would
    // strand half the card empty whenever every position is down — which is
    // exactly when this chart matters most. The padding leaves room for the
    // value label sitting at each bar's free end.
    const PAD = 1.34;
    const hi = Math.max(0, ...vals);
    const lo = Math.min(0, ...vals);
    const min = lo < 0 ? lo * PAD : 0;
    const max = hi > 0 ? hi * PAD : Math.abs(lo) * 0.06;

    return {
      tooltip: {
        ...tooltip,
        formatter: (p: { name: string; value: number; dataIndex: number }) => {
          const h = rows[p.dataIndex];
          const basis = h?.costBasis;
          const pct =
            basis && basis > 0 ? ` (${((p.value / basis) * 100).toFixed(1)}%)` : "";
          return `<b>${p.name}</b><br/>${usd(p.value, { sign: true })}${pct} open`;
        },
      },
      grid: { top: 6, bottom: 6, left: 4, right: 4, containLabel: true },
      xAxis: {
        type: "value",
        min,
        max,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: C.inkSoft, fontSize: 11.5, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: vals.map((v) => ({
            value: v,
            itemStyle: {
              color: hGrad(v >= 0 ? C.pos : C.neg),
              borderRadius: v >= 0 ? [4, 6, 6, 4] : [6, 4, 4, 6],
              ...barShadow,
            },
          })),
          barWidth: 15,
          emphasis: emphasisBar,
          label: {
            show: true,
            position: "right",
            formatter: (p: { value: number }) =>
              `${p.value >= 0 ? "+" : "−"}${compact(Math.abs(p.value))}`,
            color: C.ink,
            fontSize: 11.5,
            fontWeight: 700,
          },
          // A negative bar grows leftward, so ECharts' "right" position would
          // park its label back at the zero line. Move those to the free end.
          labelLayout: (p: { dataIndex: number; rect: { x: number } }) =>
            vals[p.dataIndex] >= 0 ? {} : { x: p.rect.x - 8, align: "right" as const },
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ xAxis: 0 }],
            lineStyle: { color: C.line, width: 1.5, type: "solid" as const },
            label: { show: false },
          },
        },
      ],
    };
  }, [rows]);

  if (rows.length === 0) return null;

  return <EChart option={option} height={Math.max(140, rows.length * 42 + 20)} />;
}
