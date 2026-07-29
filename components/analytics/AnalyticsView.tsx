"use client";

import { useMemo, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { EquityPanel } from "@/components/journal/EquityPanel";
import { keyFindingsCards } from "@/components/analytics/KeyFindings";
import {
  PieCard,
  DivergingBar,
  ColumnChart,
  BarBreakdown,
  DistributionCard,
  ActivityChart,
  TreemapChart,
} from "@/components/analytics/lazy-charts";
import { TagPerformanceCard } from "@/components/analytics/TagPerformanceCard";
import {
  computeAnalytics,
  type AnalyticsTrade,
  type OvertradingBucket,
} from "@/lib/analysis/analytics";
import { RANGES, RANGE_LABEL, windowStart, type RangeKey } from "@/lib/analysis/range";
import { usd } from "@/lib/format";
import type { TagPerformance } from "@/lib/queries/journal";

/**
 * The whole analytics page, driven by one date-range filter. Everything —
 * insights, KPIs, equity curve, every breakdown — recomputes client-side from
 * the same window, so switching 1M ↔ YTD is instant and the charts animate.
 */
export function AnalyticsView({
  trades,
  tagPerformance,
}: {
  trades: AnalyticsTrade[];
  tagPerformance: TagPerformance[];
}) {
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
  const findings = a ? keyFindingsCards(a) : [];

  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1160px] lg:pt-10">
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

          {findings.length > 0 && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 className="text-[14px] font-semibold text-ink">Key findings</h2>
              <span className="text-[11.5px] text-ink-faint">how you actually trade</span>
            </div>
          )}

          {/* One mosaic — behavioural findings first, then the breakdowns, all
              packed into two balanced columns so no card strands a gap. */}
          <div className="gap-3 pb-2 lg:columns-2">
            {a.rStats && (
              <div className="mb-3 break-inside-avoid">
                <RCard r={a.rStats} />
              </div>
            )}
            {findings.map((card, i) => (
              <div key={`kf-${i}`} className="mb-3 break-inside-avoid">
                {card}
              </div>
            ))}
            <div className="mb-3 break-inside-avoid">
              <PieCard
                title="Options vs stocks"
                question="Which instrument makes you money?"
                buckets={a.byType}
                href="/analytics/type"
              />
            </div>
            <div className="mb-3 break-inside-avoid">
              <DivergingBar
                title="Long vs short"
                question="Bullish vs bearish."
                left={long}
                right={short}
                href="/analytics/direction"
              />
            </div>
            <div className="mb-3 break-inside-avoid">
              <BarBreakdown
                title="By day of week"
                question="When do you trade best?"
                buckets={a.byDayOfWeek}
                href="/analytics/days"
              />
            </div>
            {a.bySession && (
              <div className="mb-3 break-inside-avoid">
                <BarBreakdown
                  title="By time of day"
                  question="Which part of the session pays — and which bleeds?"
                  buckets={a.bySession}
                />
              </div>
            )}
            {a.overtrading && (
              <div className="mb-3 break-inside-avoid">
                <OvertradingCard buckets={a.overtrading} />
              </div>
            )}
            <div className="mb-3 break-inside-avoid">
              <ColumnChart
                title="By hold length"
                question="Do longer holds pay off?"
                buckets={a.byHold}
                emptyLabel="Needs execution times — connect your brokerage."
                href="/analytics/hold"
              />
            </div>
            <div className="mb-3 break-inside-avoid">
              <ActivityChart monthly={a.monthly} href="/analytics/activity" />
            </div>
            <div className="mb-3 break-inside-avoid">
              <TreemapChart
                title="Symbols"
                question="Where you make and lose the most."
                buckets={a.symbols}
                href="/analytics/symbols"
              />
            </div>
            <div className="mb-3 break-inside-avoid">
              <DistributionCard buckets={a.distribution} />
            </div>
          </div>
          <div className="mb-6" />
        </>
      )}

      {/* Tags are labelled by the trader, aggregated all-time — so this sits
          outside the date-range block; it answers "which setups work" not
          "how did this month go". */}
      {tagPerformance.length > 0 && (
        <div className="mt-2 pb-6">
          <TagPerformanceCard tags={tagPerformance} />
        </div>
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

const asR = (r: number) => `${r > 0 ? "+" : ""}${r.toFixed(2)}R`;

/**
 * Overtrading — average result on a day, binned by how many trades that day
 * held. A curve that falls as the trade count rises is the classic tell: the
 * more you trade in a session, the worse the day tends to end.
 */
function OvertradingCard({ buckets }: { buckets: OvertradingBucket[] }) {
  const max = Math.max(...buckets.map((b) => Math.abs(b.avgDayPnl)), 1);
  const quiet = buckets[0]?.avgDayPnl ?? 0;
  const busy = buckets[buckets.length - 1]?.avgDayPnl ?? 0;
  const worseWhenBusy = buckets.length >= 2 && busy < quiet;

  return (
    <SurfaceCard className="p-4">
      <h3 className="text-[14px] font-semibold text-ink">Overtrading check</h3>
      <p className="mb-3 text-[11.5px] leading-relaxed text-ink-soft">
        Average result per day.
        {worseWhenBusy ? " Your busier days end worse." : ""}
      </p>
      <div className="space-y-2">
        {buckets.map((b) => {
          const pos = b.avgDayPnl >= 0;
          const w = (Math.abs(b.avgDayPnl) / max) * 50;
          return (
            <div key={b.label} className="flex items-center gap-3">
              <div className="w-[24%] min-w-0">
                <div className="truncate text-[12.5px] font-medium text-ink">{b.label}</div>
                <div className="tnum text-[10.5px] text-ink-faint">
                  {b.days} day{b.days === 1 ? "" : "s"}
                </div>
              </div>
              <div className="relative h-2 flex-1 rounded-full bg-surface-2">
                <div className="absolute left-1/2 top-0 h-full w-px bg-line" />
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    background: pos ? "var(--pos, #17915f)" : "var(--neg, #bd4640)",
                    width: `${w}%`,
                    left: pos ? "50%" : `${50 - w}%`,
                  }}
                />
              </div>
              <div
                className={`tnum w-[24%] text-right text-[12px] font-semibold ${
                  pos ? "text-pos" : "text-neg"
                }`}
              >
                {usd(b.avgDayPnl, { sign: true })}
              </div>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}

/**
 * R-multiple expectancy — the pro-desk read on edge. Average R across scored
 * trades is expectancy per unit of risk: positive means the system pays after
 * accounting for how much you put up. Shown only once the trader scores trades.
 */
function RCard({ r }: { r: NonNullable<ReturnType<typeof computeAnalytics>>["rStats"] }) {
  if (!r) return null;
  const up = r.avgR >= 0;
  return (
    <SurfaceCard className="p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-ink">R-multiple expectancy</h3>
        <span className="text-[11px] text-ink-faint">{r.scored} scored</span>
      </div>
      <p className="mb-3 text-[11.5px] leading-relaxed text-ink-soft">
        Average result per unit risked.
      </p>
      <div className="flex items-end gap-4">
        <div>
          <div
            className={`tnum text-[30px] font-semibold leading-none tracking-tight ${
              up ? "text-pos" : "text-neg"
            }`}
          >
            {asR(r.avgR)}
          </div>
          <div className="mt-1 text-[11px] text-ink-soft">per trade</div>
        </div>
        <div className="flex-1 border-l border-line pl-4">
          <Row label="Avg winner" value={asR(r.avgWinR)} tone="pos" />
          <Row label="Avg loser" value={asR(r.avgLossR)} tone="neg" />
          <Row label="Best / worst" value={`${asR(r.best)} / ${asR(r.worst)}`} />
        </div>
      </div>
    </SurfaceCard>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11.5px] text-ink-soft">{label}</span>
      <span
        className={`tnum text-[12.5px] font-semibold ${
          tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
