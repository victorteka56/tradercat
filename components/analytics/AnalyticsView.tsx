"use client";

import { useMemo, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { EquityPanel } from "@/components/journal/EquityPanel";
import { PieCard } from "@/components/analytics/PieCard";
import { DivergingBar } from "@/components/analytics/DivergingBar";
import { ColumnChart } from "@/components/analytics/ColumnChart";
import { BarBreakdown } from "@/components/analytics/BarBreakdown";
import { DistributionCard } from "@/components/analytics/DistributionCard";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import {
  computeAnalytics,
  type AnalyticsTrade,
  type Insight,
} from "@/lib/analysis/analytics";
import { RANGES, RANGE_LABEL, windowStart, type RangeKey } from "@/lib/analysis/range";
import { usd } from "@/lib/format";

/**
 * The whole analytics page, driven by one date-range filter. Everything —
 * insights, KPIs, equity curve, every breakdown — recomputes client-side from
 * the same window, so switching 1M ↔ YTD is instant and the charts animate.
 */
export function AnalyticsView({ trades }: { trades: AnalyticsTrade[] }) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const now = Date.now();

  const filtered = useMemo(() => {
    if (range === "ALL") return trades;
    const from = windowStart(range, now);
    return trades.filter((t) => t.exitMs != null && t.exitMs >= from);
  }, [trades, range, now]);

  const a = useMemo(() => computeAnalytics(filtered), [filtered]);

  // Full series (unfiltered) — the equity panel windows it by the same range.
  const series = useMemo(
    () =>
      trades
        .filter((t) => t.exitMs != null)
        .map((t) => ({ t: t.exitMs as number, pnl: t.pnl }))
        .sort((x, y) => x.t - y.t),
    [trades],
  );

  const long = a?.byDirection.find((b) => b.key === "long");
  const short = a?.byDirection.find((b) => b.key === "short");

  const symbolsRanked = useMemo(() => {
    if (!a) return [];
    const sorted = [...a.symbols].sort((x, y) => y.pnl - x.pnl);
    return [...sorted.filter((b) => b.pnl > 0).slice(0, 5), ...sorted.filter((b) => b.pnl < 0).slice(-5)];
  }, [a]);

  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1000px] lg:pt-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Analytics
        </h1>
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
          <h2 className="text-[16px] font-semibold text-ink">
            No closed trades {RANGE_LABEL[range]}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] text-ink-soft">
            Try a wider range — your full history is under ALL.
          </p>
        </SurfaceCard>
      ) : (
        <>
          {a.insights.length > 0 && (
            <div className="mb-4 space-y-2.5">
              {a.insights.map((ins, i) => (
                <InsightRow key={i} insight={ins} />
              ))}
            </div>
          )}

          {/* Deeper than the Home summary — risk, reward quality, behaviour. */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Win rate"
              value={`${a.summary.winRate}%`}
              sub={`${a.summary.winners}W · ${a.summary.losers}L`}
            />
            <MetricCard
              label="Payoff ratio"
              value={a.summary.payoffRatio != null ? `${a.summary.payoffRatio.toFixed(2)}×` : "—"}
              tone={a.summary.payoffRatio != null && a.summary.payoffRatio >= 1 ? "pos" : "neg"}
              sub="avg win ÷ avg loss"
            />
            <MetricCard
              label="Max drawdown"
              value={a.summary.maxDrawdown > 0 ? usd(-a.summary.maxDrawdown) : "—"}
              tone="neg"
              sub="deepest dip"
            />
            <MetricCard
              label="Avg hold"
              value={fmtHold(a.summary.avgHoldDays)}
              sub="per trade"
            />
          </div>

          <div className="mb-4">
            <EquityPanel series={series} title="Equity" controlledRange={range} />
          </div>

          {/* Behaviour — the part Home doesn't tell you. */}
          {a.behavior.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-[14px] font-semibold text-ink">Your behaviour</h2>
                <span className="text-[11.5px] text-ink-faint">patterns in how you trade</span>
              </div>
              <div className="space-y-2.5">
                {a.behavior.map((ins, i) => (
                  <InsightRow key={i} insight={ins} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <PieCard
              title="Options vs stocks"
              question="Which instrument makes you money?"
              buckets={a.byType}
            />
            <DivergingBar
              title="Long vs short"
              question="Bullish bets (longs & calls) vs bearish (shorts & puts)."
              left={long}
              right={short}
            />
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <ColumnChart
              title="By day of week"
              question="When do you trade best?"
              buckets={a.byDayOfWeek}
            />
            <ColumnChart
              title="By hold length"
              question="Do longer holds pay off?"
              buckets={a.byHold}
              emptyLabel="Needs execution times — connect your brokerage."
            />
          </div>

          <div className="mb-4">
            <ActivityChart monthly={a.monthly} />
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <BarBreakdown
              title="Symbols"
              question="Where you make and lose the most."
              buckets={symbolsRanked}
              emptyLabel="Not enough per-symbol history yet."
            />
            <DistributionCard buckets={a.distribution} />
          </div>
          <div className="mb-6" />
        </>
      )}
    </main>
  );
}

function fmtHold(days: number | null): string {
  if (days == null) return "—";
  if (days < 1) return "<1d";
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

function InsightRow({ insight }: { insight: Insight }) {
  const dot =
    insight.tone === "pos" ? "bg-pos" : insight.tone === "neg" ? "bg-neg" : "bg-info";
  return (
    <SurfaceCard className="flex gap-3 p-3.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{insight.title}</div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          {insight.detail}
        </div>
      </div>
    </SurfaceCard>
  );
}
