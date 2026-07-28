import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TradeChart, type ChartCandle } from "./TradeChart";
import type { JournalTrade } from "@/lib/queries/journal";
import type { Interval } from "@/lib/market/provider";
import { dateTimeLabel } from "@/lib/format";

interface Props {
  trade: JournalTrade;
  data: {
    candles: ChartCandle[];
    entryPrice: number | null;
    exitPrice: number | null;
    interval: Interval;
    fromMs: number;
    toMs: number;
  } | null;
  marketDataConfigured: boolean;
}

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Explains the trade in one sentence a beginner can read.
 *
 * The chart shows the *underlying*, but the fills are option premiums — a
 * genuinely confusing gap ("why does it say I paid $13.95 when the chart says
 * $690?"). So we name both explicitly and connect them: the option moved
 * because the underlying moved.
 */
function plainSummary(t: JournalTrade, entry: number | null, exit: number | null) {
  const isOption = t.kind === "option";
  const won = t.netPnl >= 0;

  if (entry == null || exit == null) {
    return `This chart shows ${t.symbol}${isOption ? "'s share price" : ""} around the time you traded. The arrows mark when you bought and sold.`;
  }

  const moved = exit - entry;
  const dir = moved >= 0 ? "up" : "down";
  const pctMove = Math.abs((moved / entry) * 100).toFixed(1);

  if (!isOption) {
    return `${t.symbol} went ${dir} ${pctMove}% (${money(entry)} → ${money(exit)}) while you held.`;
  }

  const helped =
    (t.optionType === "call" && moved > 0) || (t.optionType === "put" && moved < 0);

  return (
    `${t.symbol} went ${dir} ${pctMove}% (${money(entry)} → ${money(exit)}) — ` +
    `${helped ? "in your favour" : "against you"} for a ${t.optionType}.`
  );
}

export function TradeChartCard({ trade, data, marketDataConfigured }: Props) {
  if (!trade.entryAt) return null;

  // Be specific about *why* there's no chart — each cause has a different fix.
  if (!data) {
    const reason = !marketDataConfigured
      ? "A market data provider isn't connected yet."
      : trade.source !== "snaptrade"
      ? "CSV imports don't include the time of day, so we can't line your trade up against the price."
      : `We couldn't find price history for ${trade.symbol} around this trade.`;

    return (
      <SurfaceCard className="mb-4 p-4">
        <div className="text-[13px] font-semibold text-ink">Price chart</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{reason}</p>
        {trade.source !== "snaptrade" && (
          <Link
            href="/import"
            className="mt-2 inline-block text-[12.5px] font-semibold text-info"
          >
            Connect your brokerage to get exact times →
          </Link>
        )}
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink">
          {trade.symbol} share price
        </span>
        <span className="text-[11px] text-ink-faint">
          around your trade · times in ET
        </span>
      </div>

      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">
        {plainSummary(trade, data.entryPrice, data.exitPrice)}
      </p>

      <TradeChart
        candles={data.candles}
        entryTime={Math.floor(new Date(trade.entryAt).getTime() / 1000)}
        exitTime={trade.exitAt ? Math.floor(new Date(trade.exitAt).getTime() / 1000) : null}
        entryPrice={data.entryPrice}
        exitPrice={data.exitPrice}
        direction={trade.direction}
        underlying={trade.symbol}
        positive={trade.netPnl >= 0}
        interval={data.interval}
        fromMs={data.fromMs}
        toMs={data.toMs}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-pos">
            Entry
          </span>
          <div className="tnum mt-0.5 text-[12px] text-ink">
            {dateTimeLabel(trade.entryAt)}
          </div>
          {data.entryPrice != null && (
            <div className="tnum text-[11px] text-ink-faint">
              {trade.symbol} was {money(data.entryPrice)}
            </div>
          )}
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neg">
            Exit
          </span>
          <div className="tnum mt-0.5 text-[12px] text-ink">
            {trade.exitAt ? dateTimeLabel(trade.exitAt) : "Still open"}
          </div>
          {data.exitPrice != null && (
            <div className="tnum text-[11px] text-ink-faint">
              {trade.symbol} was {money(data.exitPrice)}
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
