"use client";

import { useMemo, useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { RealizedPoint } from "@/lib/queries/journal";
import { RANGES, RANGE_LABEL, windowStart, type RangeKey } from "@/lib/analysis/range";
import { usd, usdCompact } from "@/lib/format";

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

const W = 600;
const H = 180;
const PAD = 10;

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
  const [hover, setHover] = useState<number | null>(null);
  const svgWrap = useRef<HTMLDivElement>(null);
  const now = Date.now();

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
    const pts: { t: number; v: number }[] = [{ t: anchorT, v: baseline }];
    let cum = baseline;
    let rangePnl = 0;
    let winners = 0;
    for (const p of inRange) {
      cum += p.pnl;
      rangePnl += p.pnl;
      if (p.pnl > 0) winners++;
      pts.push({ t: p.t, v: cum });
    }
    // Extend the line to "now" for bounded windows so it spans the full width;
    // a window with no trades still draws a flat baseline.
    if (range !== "ALL" || pts.length < 2) pts.push({ t: now, v: cum });

    const vs = pts.map((p) => p.v);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const t0 = pts[0].t;
    const t1 = pts[pts.length - 1].t;

    return {
      pts,
      min,
      max,
      t0,
      t1,
      rangePnl,
      count: inRange.length,
      winners,
      endEquity: cum,
    };
  }, [series, range, now]);

  if (series.length === 0) {
    return (
      <SurfaceCard className="p-4">
        <PanelHeader
          title={title}
          range={range}
          setRange={setRange}
          showTabs={showTabs}
          rangePnl={0}
          count={0}
          winners={0}
        />
        <div className="flex h-[140px] items-center justify-center text-[13px] text-ink-faint">
          No realized trades yet.
        </div>
      </SurfaceCard>
    );
  }

  const { pts, min, max, t0, t1 } = model;
  const span = max - min || 1;
  const tSpan = t1 - t0 || 1;
  const x = (t: number) => ((t - t0) / tSpan) * W;
  const y = (v: number) => H - ((v - min) / span) * (H - PAD * 2) - PAD;

  const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const up = model.endEquity >= model.pts[0].v;
  const color = up ? "var(--pos)" : "var(--neg)";
  const zeroInView = min < 0 && max > 0;

  const onMove = (clientX: number) => {
    const el = svgWrap.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetT = t0 + frac * tSpan;
    // nearest point by time
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].t - targetT);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const hp = hover != null ? pts[hover] : null;
  const hoverLeftPct = hp ? (x(hp.t) / W) * 100 : 0;

  return (
    <SurfaceCard className="p-4">
      <PanelHeader
        title={title}
        range={range}
        setRange={setRange}
        showTabs={showTabs}
        rangePnl={model.rangePnl}
        count={model.count}
        winners={model.winners}
      />

      <div
        ref={svgWrap}
        className="relative mt-3 select-none"
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        {/* y-axis value markers */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between py-0.5 text-[10px] font-semibold text-ink-faint">
          <span className="tnum rounded bg-surface/70 px-1">{usdCompact(max)}</span>
          <span className="tnum rounded bg-surface/70 px-1">{usdCompact(min)}</span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[180px] w-full"
        >
          <defs>
            <linearGradient id="eqpanelfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {zeroInView && (
            <line
              x1="0"
              x2={W}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--ink-faint)"
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <polygon points={area} fill="url(#eqpanelfill)" />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hp && (
            <>
              <line
                x1={x(hp.t)}
                x2={x(hp.t)}
                y1="0"
                y2={H}
                stroke="var(--ink-faint)"
                strokeOpacity="0.5"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={x(hp.t)}
                cy={y(hp.v)}
                r="3.5"
                fill={color}
                stroke="var(--surface)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* hover readout */}
        {hp && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${hoverLeftPct}%` }}
          >
            <div className="whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-center shadow-card">
              <div
                className={`tnum text-[12.5px] font-semibold ${
                  hp.v >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(hp.v, { sign: true })}
              </div>
              <div className="text-[10px] text-ink-faint">{fmtDay(hp.t)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
        <span>{fmtDay(t0)}</span>
        <span>{fmtDay(t1)}</span>
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
