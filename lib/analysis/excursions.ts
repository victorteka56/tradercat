import type { Candle } from "@/lib/market/provider";

/**
 * Deterministic trade metrics computed from the *underlying's* candles.
 *
 * A crucial honesty point: we chart and measure the underlying, not the option
 * premium (we don't have per-contract bars). So these are **thesis** excursions
 * — how far the underlying moved for and against your directional bet — not the
 * option's mark-to-market drawdown, which also carries theta and IV. Everything
 * here is labelled and phrased to reflect that. This is what the AI narrates; it
 * never invents these numbers.
 */

export interface Excursions {
  /** "bullish" (needed the underlying up) or "bearish" (needed it down). */
  thesis: "bullish" | "bearish";
  entryPrice: number;
  exitPrice: number;
  /** Underlying move entry→exit, signed toward the thesis (positive = for you). */
  netMovePct: number;
  /** Best the underlying got in your favour during the hold (%, ≥ 0). */
  favorableExcursionPct: number;
  /** Worst it went against you during the hold (%, ≥ 0, a magnitude). */
  adverseExcursionPct: number;
  /** How much of the favourable move you kept at exit (0-100, null if none). */
  capturedPct: number | null;
  /** Where entry sat in the hold's price range: 0 = the low, 100 = the high. */
  entryPositionPct: number | null;
  /** True if the underlying ultimately moved the way the thesis needed. */
  directionCorrect: boolean;
  barsUsed: number;
}

function thesisOf(
  kind: string,
  direction: "long" | "short",
  optionType: "call" | "put" | null,
): "bullish" | "bearish" {
  if (kind === "option" && optionType) {
    return optionType === "call" ? "bullish" : "bearish";
  }
  return direction === "long" ? "bullish" : "bearish";
}

export function computeExcursions(
  candles: Candle[],
  entryAt: Date,
  exitAt: Date | null,
  entryPrice: number,
  exitPrice: number,
  kind: string,
  direction: "long" | "short",
  optionType: "call" | "put" | null,
): Excursions | null {
  const end = exitAt ?? candles[candles.length - 1]?.ts ?? entryAt;
  const hold = candles.filter(
    (c) => c.ts.getTime() >= entryAt.getTime() && c.ts.getTime() <= end.getTime(),
  );
  if (hold.length === 0 || entryPrice <= 0) return null;

  const thesis = thesisOf(kind, direction, optionType);
  const bullish = thesis === "bullish";

  let hi = -Infinity;
  let lo = Infinity;
  for (const c of hold) {
    if (c.high > hi) hi = c.high;
    if (c.low < lo) lo = c.low;
  }

  const pct = (from: number, to: number) => ((to - from) / from) * 100;

  // Signed toward the thesis: a bullish trade profits when price rises.
  const towardThesis = (price: number) =>
    bullish ? pct(entryPrice, price) : -pct(entryPrice, price);

  const favorableExtreme = bullish ? hi : lo;
  const adverseExtreme = bullish ? lo : hi;

  const favorableExcursionPct = Math.max(0, towardThesis(favorableExtreme));
  const adverseExcursionPct = Math.max(0, -towardThesis(adverseExtreme));
  const netMovePct = towardThesis(exitPrice);

  // Of the favourable move that was available, how much did the exit lock in?
  const capturedPct =
    favorableExcursionPct > 0.01
      ? Math.max(
          0,
          Math.min(100, (towardThesis(exitPrice) / favorableExcursionPct) * 100),
        )
      : null;

  const range = hi - lo;
  const entryPositionPct =
    range > 0
      ? Math.round((((entryPrice - lo) / range) * 100 + Number.EPSILON) * 10) / 10
      : null;

  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  return {
    thesis,
    entryPrice: round(entryPrice),
    exitPrice: round(exitPrice),
    netMovePct: round(netMovePct),
    favorableExcursionPct: round(favorableExcursionPct),
    adverseExcursionPct: round(adverseExcursionPct),
    capturedPct: capturedPct === null ? null : Math.round(capturedPct),
    entryPositionPct,
    directionCorrect: netMovePct >= 0,
    barsUsed: hold.length,
  };
}
