import type { Excursions } from "@/lib/analysis/excursions";
import type { TradeReview } from "./trade-review";

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

  observations.push({
    label: "Worst point",
    detail:
      e.adverseExcursionPct < 0.05
        ? `${symbol} barely moved against you during the hold.`
        : `At its worst, ${symbol} moved ${e.adverseExcursionPct}% against the trade before you closed.`,
  });

  const toReview =
    e.capturedPct != null && e.capturedPct < 60 && won
      ? `${symbol} kept moving in your favour after you exited — worth noticing what prompted the exit.`
      : !e.directionCorrect
      ? `The share price moved against the trade the whole way — worth reviewing the entry timing.`
      : null;

  return { headline, whatHappened, observations, toReview };
}
