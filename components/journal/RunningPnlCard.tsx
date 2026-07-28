"use client";

import { useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { RunningPnl } from "@/lib/analysis/running-pnl";
import { usd, usdCompact } from "@/lib/format";

/**
 * The trade's P/L journey — how deep the drawdown got and how high it ran before
 * you closed. The area is two-tone (green while in profit, red while underwater),
 * peak/trough are marked, and hovering reads the P/L at any moment. For options
 * the curve is an estimate from the underlying (labelled as such).
 */

const W = 600;
const H = 180;
const PAD = 14;

const fmtTime = (t: number) =>
  new Date(t * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function RunningPnlCard({
  data,
  symbol,
}: {
  data: RunningPnl;
  symbol: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const { points, peak, trough, final, giveback, estimated } = data;

  const vs = points.map((p) => p.pnl);
  const min = Math.min(...vs, 0);
  const max = Math.max(...vs, 0);
  const span = max - min || 1;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const tSpan = t1 - t0 || 1;

  const x = (t: number) => ((t - t0) / tSpan) * W;
  const y = (v: number) => H - ((v - min) / span) * (H - PAD * 2) - PAD;
  const zeroY = Math.min(H, Math.max(0, y(0)));

  const line = points.map((p) => `${x(p.t).toFixed(1)},${y(p.pnl).toFixed(1)}`).join(" ");
  // Filled to the zero baseline, so the shaded area reads as "in profit" above
  // and "underwater" below once the clip masks split it.
  const areaToZero = `${line} ${W},${zeroY.toFixed(1)} 0,${zeroY.toFixed(1)}`;

  const onMove = (clientX: number) => {
    const el = wrap.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetT = t0 + frac * tSpan;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].t - targetT);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const hp = hover != null ? points[hover] : null;
  const zeroPct = (zeroY / H) * 100;

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink">Running P/L</span>
        <span className="text-[11px] text-ink-faint">
          {estimated ? `estimated from ${symbol}'s price` : "mark-to-market"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Metric label="Peak" value={usd(peak.pnl, { sign: true })} tone="pos" />
        <Metric label="Lowest" value={usd(trough.pnl, { sign: true })} tone="neg" />
        <Metric
          label="Given back"
          value={giveback > 0.5 ? `-${usd(giveback)}` : "—"}
          tone={giveback > 0.5 ? "neg" : "muted"}
        />
        <Metric
          label="Closed at"
          value={usd(final, { sign: true })}
          tone={final >= 0 ? "pos" : "neg"}
        />
      </div>

      <div
        ref={wrap}
        className="relative mt-3 select-none"
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        {/* y-axis $ labels */}
        <div className="pointer-events-none absolute inset-0">
          <span className="tnum absolute left-0 top-0 rounded bg-surface/70 px-1 text-[10px] font-semibold text-ink-faint">
            {usdCompact(max)}
          </span>
          {min < 0 && max > 0 && (
            <span
              className="tnum absolute left-0 -translate-y-1/2 rounded bg-surface/70 px-1 text-[10px] font-semibold text-ink-faint"
              style={{ top: `${zeroPct}%` }}
            >
              $0
            </span>
          )}
          <span className="tnum absolute bottom-0 left-0 rounded bg-surface/70 px-1 text-[10px] font-semibold text-ink-faint">
            {usdCompact(min)}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[180px] w-full"
        >
          <defs>
            <clipPath id="rpnl-above">
              <rect x="0" y="0" width={W} height={zeroY} />
            </clipPath>
            <clipPath id="rpnl-below">
              <rect x="0" y={zeroY} width={W} height={H - zeroY} />
            </clipPath>
            <linearGradient id="rpnl-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pos)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--pos)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rpnl-neg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neg)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--neg)" stopOpacity="0.34" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          <line x1="0" x2={W} y1={PAD} y2={PAD} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={H - PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {min < 0 && max > 0 && (
            <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--ink-faint)"
              strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          )}

          {/* two-tone gradient fill — richest at the extremes, fading to zero */}
          <polygon points={areaToZero} fill="url(#rpnl-pos)" clipPath="url(#rpnl-above)" />
          <polygon points={areaToZero} fill="url(#rpnl-neg)" clipPath="url(#rpnl-below)" />

          <polyline
            points={line}
            fill="none"
            stroke="var(--ink-soft)"
            strokeOpacity="0.72"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* entry / exit endpoints */}
          <circle cx={x(points[0].t)} cy={y(points[0].pnl)} r="3" fill="var(--surface)"
            stroke="var(--ink-faint)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <circle cx={x(t1)} cy={y(final)} r="3.5" fill={final >= 0 ? "var(--pos)" : "var(--neg)"}
            stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

          {/* peak / trough */}
          <circle cx={x(peak.t)} cy={y(peak.pnl)} r="3.5" fill="var(--pos)"
            stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <circle cx={x(trough.t)} cy={y(trough.pnl)} r="3.5" fill="var(--neg)"
            stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

          {hp && (
            <>
              <line x1={x(hp.t)} x2={x(hp.t)} y1="0" y2={H}
                stroke="var(--ink-faint)" strokeOpacity="0.5" strokeWidth="1"
                vectorEffect="non-scaling-stroke" />
              <circle cx={x(hp.t)} cy={y(hp.pnl)} r="3.5"
                fill={hp.pnl >= 0 ? "var(--pos)" : "var(--neg)"}
                stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${(x(hp.t) / W) * 100}%` }}
          >
            <div className="whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-center shadow-card">
              <div
                className={`tnum text-[12.5px] font-semibold ${
                  hp.pnl >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(hp.pnl, { sign: true })}
              </div>
              <div className="text-[10px] text-ink-faint">{fmtTime(hp.t)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-faint">
        <span>{fmtTime(t0)}</span>
        <span>{fmtTime(t1)}</span>
      </div>
    </SurfaceCard>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg" | "muted";
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div
        className={`tnum mt-0.5 text-[15px] font-semibold ${
          tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink-faint"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
