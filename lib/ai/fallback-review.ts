import type { Excursions } from "@/lib/analysis/excursions";
import type { RunSummary, TradeReview } from "./trade-review";

const money = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * A solid trade review with no LLM — built entirely from the computed numbers.
 *
 * This is the floor: it's always available (the excursions are deterministic),
 * so the user never sees an error or an empty state. The DeepSeek narrative,
 * when it succeeds, replaces this with warmer prose — but this is genuinely
 * useful on its own, not a placeholder.
 */
export function fallbackReview(
  name: string,
  symbol: string,
  kind: string,
  optionType: "call" | "put" | null,
  netPnl: number,
  contractEntry: number | null,
  contractExit: number | null,
  holdingLabel: string,
  e: Excursions,
  run: RunSummary | null = null,
): TradeReview {
  const won = netPnl >= 0;
  const dir = e.thesis === "bullish" ? "rise" : "fall";
  const bet =
    kind === "option" && optionType
      ? `a ${optionType} — a bet that ${symbol} would ${dir}`
      : `a bet that ${symbol} would ${dir}`;

  const headline = won
    ? `${symbol} moved ${e.netMovePct}% your way and you kept ${
        e.capturedPct ?? 0
      }% of the best move.`
    : `${symbol} moved ${e.adverseExcursionPct}% against you and the trade lost $${Math.abs(
        netPnl,
      ).toLocaleString("en-US")}.`;

  const contractLine =
    contractEntry != null && contractExit != null
      ? ` The option went from $${contractEntry} to $${contractExit} a share.`
      : "";

  const whatHappened =
    `You held ${name} for ${holdingLabel} — ${bet}. ` +
    `${symbol}'s share price went from $${e.entryPrice} to $${e.exitPrice}, ` +
    `${
      e.directionCorrect ? "moving the way the trade needed" : "moving against the trade"
    }.${contractLine}`;

  const observations: TradeReview["observations"] = [];

  if (e.entryPositionPct != null) {
    const where =
      e.entryPositionPct <= 33 ? "near the low" : e.entryPositionPct >= 67 ? "near the high" : "around the middle";
    observations.push({
      label: "Entry timing",
      detail: `You entered ${where} of ${symbol}'s range during the hold (${e.entryPositionPct}% mark, where 0% is the lowest point).`,
    });
  }

  if (e.capturedPct != null && e.favorableExcursionPct > 0.01) {
    observations.push({
      label: "Exit timing",
      detail: `${symbol} rose as much as ${e.favorableExcursionPct}% in your favour; you captured about ${e.capturedPct}% of that before closing.`,
    });
  }

  // Prefer the position's own dollar P/L journey — it's the most concrete story
  // of the drawdown sat through or the gains given back. Fall back to the
  // underlying's % move only when we have no running-P/L figures.
  const about = run?.estimated ? "about " : "";
  const gaveBackShare = run && run.peak > 0 ? run.giveback / run.peak : 0;

  if (run && won && run.peakBeforeExit && gaveBackShare >= 0.3 && run.giveback >= 1) {
    observations.push({
      label: "Gave back gains",
      detail: `You were ${about}up ${money(run.peak)} at the best point, then gave back ${about}${money(run.giveback)} before closing at ${money(netPnl)}.`,
    });
  } else if (run && run.worst < -0.5) {
    observations.push({
      label: won ? "Sat through drawdown" : "Deepest drawdown",
      detail: `The position was ${about}down ${money(run.worst)} at its worst${won ? " before recovering" : ""}.`,
    });
  } else {
    observations.push({
      label: "Worst point",
      detail:
        e.adverseExcursionPct < 0.05
          ? `${symbol} barely moved against you during the hold.`
          : `At its worst, ${symbol} moved ${e.adverseExcursionPct}% against the trade before you closed.`,
    });
  }

  const toReview =
    run && won && run.peakBeforeExit && gaveBackShare >= 0.4 && run.giveback >= 1
      ? `You gave back ${about}${money(run.giveback)} of a ${money(run.peak)} peak — worth noticing what kept the trade open past its high.`
      : e.capturedPct != null && e.capturedPct < 60 && won
      ? `${symbol} kept moving in your favour after you exited — worth noticing what prompted the exit.`
      : !e.directionCorrect
      ? `The share price moved against the trade the whole way — worth reviewing the entry timing.`
      : null;

  return { headline, whatHappened, observations, toReview };
}
