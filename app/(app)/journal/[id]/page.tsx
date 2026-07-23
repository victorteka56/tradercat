import Link from "next/link";
import { notFound } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getTradeById, getTradeFills, getTradeNote } from "@/lib/queries/journal";
import { tradeLabel, tradeSubtitle } from "@/lib/trade-display";
import {
  usd,
  holdingLabel,
  dayLabel,
  timeLabel,
  dateTimeLabel,
  hasTimeOfDay,
} from "@/lib/format";
import { SourceBadge } from "@/components/journal/SourceBadge";
import { TradeChartCard } from "@/components/journal/TradeChartCard";
import { ExcursionCard } from "@/components/journal/ExcursionCard";
import { RunningPnlCard } from "@/components/journal/RunningPnlCard";
import { TradeNotesCard } from "@/components/journal/TradeNotesCard";
import { TradeAnalysisDrawer } from "@/components/journal/TradeAnalysisDrawer";
import { getTradeChart, marketDataConfigured } from "@/lib/market/candles";
import { computeExcursions } from "@/lib/analysis/excursions";
import { computeRunningPnl } from "@/lib/analysis/running-pnl";
import { getInitialReview } from "@/lib/ai/trade-review";

export default async function TradeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const trade = await getTradeById(user.id, params.id);
  if (!trade) notFound();

  const [fills, note] = await Promise.all([
    getTradeFills(user.id, trade.id),
    getTradeNote(user.id, trade.id),
  ]);
  const up = trade.netPnl >= 0;

  /**
   * A chart is only honest when we know *when* the trade happened. CSV fills
   * land on midnight, so plotting them would invent precision we don't have.
   */
  const canChart =
    marketDataConfigured && trade.entryAt != null && hasTimeOfDay(trade.entryAt);

  const chart = canChart
    ? await getTradeChart(trade.symbol, trade.entryAt!, trade.exitAt).catch(
        () => null,
      )
    : null;

  // The chart shows the coarser display bars (15min by default); the excursion
  // and running-P/L math below runs on the finer `chart.candles`.
  const chartData = chart
    ? {
        candles: chart.displayCandles.map((c) => ({
          time: Math.floor(c.ts.getTime() / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        })),
        entryPrice: chart.entryPrice,
        exitPrice: chart.exitPrice,
        interval: chart.displayInterval,
        fromMs: chart.from.getTime(),
        toMs: chart.to.getTime(),
      }
    : null;

  // Computed timing metrics (free, deterministic) — the basis for the AI review.
  const excursions =
    chart && chart.entryPrice != null && chart.exitPrice != null && trade.entryAt
      ? computeExcursions(
          chart.candles,
          trade.entryAt,
          trade.exitAt,
          chart.entryPrice,
          chart.exitPrice,
          trade.kind,
          trade.direction,
          trade.optionType,
        )
      : null;

  // The trade's dollar P/L path over the hold — drawdown and run-up. Exact for
  // stocks; an underlying-derived estimate for options (labelled as such).
  const running =
    chart && trade.entryAt && chart.entryPrice != null && chart.exitPrice != null
      ? computeRunningPnl({
          candles: chart.candles,
          entryAt: trade.entryAt,
          exitAt: trade.exitAt,
          kind: trade.kind,
          direction: trade.direction,
          entryUnderlying: chart.entryPrice,
          exitUnderlying: chart.exitPrice,
          avgEntryPrice: trade.avgEntryPrice,
          avgExitPrice: trade.avgExitPrice,
          qty: Math.max(trade.openedQty, trade.closedQty),
          realizedPnl: trade.netPnl,
        })
      : null;

  // Initial review state — no spend. Returns a cached AI review if one exists,
  // otherwise the computed floor, which the client upgrades in the background.
  const initialReview =
    Boolean(env.DEEPSEEK_API_KEY) && excursions
      ? await getInitialReview(user.id, trade.id).catch(() => null)
      : null;

  const isOption = trade.kind === "option";
  const size = Math.round(Math.max(trade.openedQty, trade.closedQty));
  const money2 = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

  // Timing card — the excursion breakdown, or a plain note when there's no
  // intraday history. Defined once; it sits beside the P/L journey when we have
  // one, otherwise full width.
  const timingBlock = excursions ? (
    <ExcursionCard excursions={excursions} symbol={trade.symbol} />
  ) : (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-2">
        <StatusChip tone="neutral">Timing</StatusChip>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        Measuring how far {trade.symbol} moved for and against this trade needs
        intraday price history with exact times.{" "}
        {trade.source !== "snaptrade"
          ? "CSV imports don't include times — connect your brokerage."
          : "It isn't available for this trade yet."}
      </p>
    </SurfaceCard>
  );

  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1160px] lg:pt-10">
      <Link
        href="/journal"
        className="mb-3 inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Journal
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">
              {tradeLabel(trade)}
            </h1>
            <StatusChip tone={trade.direction === "long" ? "pos" : "neg"}>
              {trade.direction}
            </StatusChip>
            <SourceBadge trade={trade} />
            {trade.status === "open" && <StatusChip tone="info">Open</StatusChip>}
          </div>
          <div className="tnum mt-1 text-[13px] text-ink-soft">
            {tradeSubtitle(trade)}
          </div>
        </div>
        <div className="text-right">
          <div
            className={`tnum text-[24px] font-semibold ${
              up ? "text-pos" : "text-neg"
            }`}
          >
            {usd(trade.netPnl, { sign: true })}
          </div>
          <div className="text-[12px] text-ink-soft">realized</div>
        </div>
      </div>

      {/* The analysis launcher — a compact teaser that opens the full,
          styled read as a panel sliding in from the right. */}
      {env.DEEPSEEK_API_KEY &&
      initialReview &&
      !("needsData" in initialReview) ? (
        <TradeAnalysisDrawer
          tradeId={trade.id}
          initial={initialReview.review}
          initialKind={initialReview.kind}
          trade={{
            symbol: trade.symbol,
            netPnl: trade.netPnl,
            pnlPct: trade.pnlPct,
            incomplete: trade.incomplete,
            held:
              trade.holdingSeconds != null && hasTimeOfDay(trade.entryAt)
                ? holdingLabel(trade.holdingSeconds)
                : null,
          }}
          run={
            running
              ? {
                  peak: running.peak.pnl,
                  trough: running.trough.pnl,
                  maxDrawdown: running.maxDrawdown,
                  giveback: running.giveback,
                  timeUnderwaterPct: running.timeUnderwaterPct,
                  estimated: running.estimated,
                }
              : null
          }
          exc={
            excursions
              ? {
                  favorable: excursions.favorableExcursionPct,
                  adverse: excursions.adverseExcursionPct,
                  captured: excursions.capturedPct,
                  netMove: excursions.netMovePct,
                  directionCorrect: excursions.directionCorrect,
                }
              : null
          }
        />
      ) : env.DEEPSEEK_API_KEY ? null : (
        <SurfaceCard className="mb-4 p-4">
          <div className="mb-2">
            <StatusChip tone="neutral">Trade analysis</StatusChip>
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Plain-English analysis of each trade. Add a DeepSeek API key to
            enable it.
          </p>
        </SurfaceCard>
      )}

      {/* Mosaic: two independent columns so cards stack to fill the height
          rather than leaving a rigid row's worth of whitespace. Left holds the
          big visuals; right stacks the numbers. */}
      <div className="lg:flex lg:items-start lg:gap-5">
        <div className="min-w-0 lg:flex-[1.7]">
          <TradeChartCard
            trade={trade}
            data={chartData}
            marketDataConfigured={marketDataConfigured}
          />
          {running && <RunningPnlCard data={running} symbol={trade.symbol} />}
        </div>

        <div className="min-w-0 lg:flex-1">
          {/* Dense stats block — a label→value list that fits the sidebar cleanly. */}
          <SurfaceCard className="mb-4 divide-y divide-line px-4">
        <Stat
          label="Net ROI"
          value={
            trade.pnlPct == null
              ? "—"
              : `${trade.pnlPct >= 0 ? "+" : ""}${trade.pnlPct.toFixed(1)}%`
          }
          tone={trade.pnlPct == null ? undefined : trade.pnlPct >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Gross P/L"
          value={usd(trade.grossPnl ?? trade.netPnl, { sign: true })}
        />
        <Stat label="Fees" value={usd(trade.fees)} />
        <Stat label="Cost basis" value={usd(trade.cost)} />
        <Stat label="Proceeds" value={usd(trade.proceeds)} />
        <Stat label="Side" value={trade.direction === "long" ? "Long" : "Short"} />
        <Stat
          label={isOption ? "Contracts" : "Shares"}
          value={size > 0 ? size.toLocaleString() : "—"}
        />
        <Stat
          label="R-multiple"
          value={
            trade.rMultiple != null && trade.riskSource
              ? `${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}R`
              : "Not set"
          }
          tone={
            trade.rMultiple != null && trade.riskSource
              ? trade.rMultiple >= 0
                ? "pos"
                : "neg"
              : undefined
          }
          muted={!(trade.rMultiple != null && trade.riskSource)}
        />
        <Stat label="Avg entry" value={money2(trade.avgEntryPrice)} />
        <Stat label="Avg exit" value={money2(trade.avgExitPrice)} />
        <Stat
          label="Held"
          value={
            trade.holdingSeconds != null && hasTimeOfDay(trade.entryAt)
              ? holdingLabel(trade.holdingSeconds)
              : "—"
          }
        />
        <Stat
          label="Account"
          value={trade.brokerName ?? "CSV import"}
        />
        <Stat
          label="Opened"
          value={dayLabel(trade.entryAt)}
          sub={timeLabel(trade.entryAt)}
        />
        <Stat
          label="Closed"
          value={dayLabel(trade.exitAt)}
          sub={timeLabel(trade.exitAt)}
        />
        </SurfaceCard>
          {timingBlock}
        </div>
      </div>

      <TradeNotesCard tradeId={trade.id} initial={note} />

      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          Fills ({fills.length})
        </span>
        {/* Say why times are missing rather than showing a fake midnight. */}
        {fills.length > 0 && !hasTimeOfDay(fills[0].executedAt) && (
          <span className="text-[11px] text-ink-faint">
            · CSV exports don&apos;t include times
          </span>
        )}
      </div>
      <SurfaceCard className="mb-6 overflow-hidden">
        <div className="divide-y divide-line">
          {fills.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="w-12 shrink-0 text-[12px] font-bold text-ink-soft">
                {f.code}
              </span>
              <span className="tnum flex-1 text-[12px] text-ink-faint">
                {dateTimeLabel(f.executedAt)}
              </span>
              <span className="tnum w-12 text-right text-[12px] text-ink-soft">
                {f.quantity}
              </span>
              <span className="tnum w-16 text-right text-[12px] text-ink-soft">
                {f.price != null ? `$${f.price}` : "—"}
              </span>
              <span
                className={`tnum w-24 text-right text-[12px] font-semibold ${
                  f.amount >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(f.amount, { sign: true })}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  muted,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: "pos" | "neg";
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="shrink-0 text-[12px] font-medium text-ink-soft">{label}</span>
      <span className="min-w-0 text-right">
        <span
          className={`tnum text-[13.5px] font-semibold ${
            tone === "pos"
              ? "text-pos"
              : tone === "neg"
              ? "text-neg"
              : muted
              ? "text-ink-faint"
              : "text-ink"
          }`}
        >
          {value}
        </span>
        {sub && <span className="tnum ml-1.5 text-[11px] text-ink-faint">{sub}</span>}
      </span>
    </div>
  );
}
