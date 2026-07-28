"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  PieCard,
  DivergingBar,
  ColumnChart,
  BarBreakdown,
  ActivityChart,
  TreemapChart,
} from "@/components/analytics/lazy-charts";
import {
  computeAnalytics,
  type AnalyticsTrade,
  type Bucket,
} from "@/lib/analysis/analytics";
import { RANGES, windowStart, type RangeKey } from "@/lib/analysis/range";
import { usd } from "@/lib/format";

export type DetailView = "type" | "direction" | "days" | "hold" | "symbols" | "activity";

const META: Record<DetailView, { title: string; subtitle: string; colLabel: string }> = {
  type: { title: "Options vs stocks", subtitle: "Every instrument type, by P/L.", colLabel: "Instrument" },
  direction: { title: "Long vs short", subtitle: "Bullish vs bearish exposure — puts count as short.", colLabel: "Direction" },
  days: { title: "By day of week", subtitle: "Which days you trade best.", colLabel: "Day" },
  hold: { title: "By hold length", subtitle: "How holding time relates to results.", colLabel: "Hold" },
  symbols: { title: "Symbols", subtitle: "Every ticker you've traded, by P/L.", colLabel: "Symbol" },
  activity: { title: "Trade activity", subtitle: "Trades and P/L by month.", colLabel: "Month" },
};

export function DimensionDetail({
  view,
  trades,
}: {
  view: DetailView;
  trades: AnalyticsTrade[];
}) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const now = Date.now();

  const filtered = useMemo(() => {
    if (range === "ALL") return trades;
    const from = windowStart(range, now);
    return trades.filter((t) => t.exitMs != null && t.exitMs >= from);
  }, [trades, range, now]);

  const a = useMemo(() => computeAnalytics(filtered), [filtered]);

  const buckets: Bucket[] = !a
    ? []
    : view === "type"
      ? a.byType
      : view === "direction"
        ? a.byDirection
        : view === "days"
          ? a.byDayOfWeek
          : view === "hold"
            ? a.byHold
            : view === "symbols"
              ? a.symbols
              : a.monthly;

  const rows = [...buckets].sort((x, y) => y.pnl - x.pnl);
  const totalPnl = rows.reduce((s, b) => s + b.pnl, 0);
  const meta = META[view];

  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[900px] lg:pt-10">
      <Link
        href="/analytics"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft"
      >
        ← Analytics
      </Link>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
            {meta.title}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">{meta.subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-full border border-line bg-surface-2/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                range === r ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {!a ? (
        <SurfaceCard className="p-8 text-center">
          <h2 className="text-[16px] font-semibold text-ink">No closed trades in this range</h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] text-ink-soft">
            Try a wider range — your full history is under ALL.
          </p>
        </SurfaceCard>
      ) : (
        <>
          <div className="mb-4">
            {view === "type" && <PieCard title={meta.title} buckets={a.byType} />}
            {view === "direction" && (
              <DivergingBar
                title={meta.title}
                left={a.byDirection.find((b) => b.key === "long")}
                right={a.byDirection.find((b) => b.key === "short")}
              />
            )}
            {view === "days" && <BarBreakdown title={meta.title} buckets={a.byDayOfWeek} />}
            {view === "hold" && <ColumnChart title={meta.title} buckets={a.byHold} />}
            {view === "symbols" && <TreemapChart title={meta.title} buckets={a.symbols} />}
            {view === "activity" && <ActivityChart monthly={a.monthly} />}
          </div>

          <SurfaceCard className="overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr] gap-2 border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <span>{meta.colLabel}</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Win %</span>
              <span className="text-right">Net P/L</span>
            </div>
            <div className="divide-y divide-line">
              {rows.map((b) => (
                <div key={b.key} className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr] items-center gap-2 px-4 py-2.5">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{b.label}</span>
                  <span className="tnum text-right text-[13px] text-ink-soft">{b.trades}</span>
                  <span className="tnum text-right text-[13px] text-ink-soft">{b.winRate}%</span>
                  <span
                    className={`tnum text-right text-[13px] font-semibold ${
                      b.pnl >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {usd(b.pnl, { sign: true })}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr] items-center gap-2 border-t border-line bg-surface-2/40 px-4 py-2.5">
              <span className="text-[12px] font-semibold text-ink-soft">Total</span>
              <span className="tnum text-right text-[12px] text-ink-faint">{a.summary.trades}</span>
              <span className="tnum text-right text-[12px] text-ink-faint">{a.summary.winRate}%</span>
              <span className={`tnum text-right text-[13px] font-semibold ${totalPnl >= 0 ? "text-pos" : "text-neg"}`}>
                {usd(totalPnl, { sign: true })}
              </span>
            </div>
          </SurfaceCard>
          <div className="mb-6" />
        </>
      )}
    </main>
  );
}
