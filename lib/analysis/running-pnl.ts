import type { Candle } from "@/lib/market/provider";

/**
 * The trade's mark-to-market P/L over the hold, in dollars.
 *
 * Honesty note: we only have the *underlying's* candles, not per-contract option
 * bars. For a stock this curve is exact. For an option it is an **estimate** —
 * the premium is modelled linearly against the underlying between the two prices
 * we actually know (entry and exit premium), then the whole curve is scaled so
 * its endpoints land exactly on $0 (entry) and the realized P/L (exit). It shows
 * the shape of the drawdown/run-up you sat through, not a broker-exact tick tape.
 */

export interface RunningPnlPoint {
  /** epoch seconds */
  t: number;
  pnl: number;
  price: number;
}

export interface RunningPnl {
  points: RunningPnlPoint[];
  /** highest the P/L reached during the hold */
  peak: RunningPnlPoint;
  /** lowest (deepest drawdown) during the hold */
  trough: RunningPnlPoint;
  final: number;
  /** largest peak→later-low decline over the path, in dollars (≥ 0) */
  maxDrawdown: number;
  /** how much of the best P/L was surrendered by the exit, in dollars (≥ 0) */
  giveback: number;
  /** deepest the position was underwater, in dollars (≥ 0; 0 if never red) */
  maxUnderwater: number;
  /** share of the hold spent underwater, 0–100 */
  timeUnderwaterPct: number;
  /** whether the peak came before the exit (i.e. gains were then given back) */
  peakBeforeExit: boolean;
  /** true when the curve is an estimate (options); false when exact (stocks) */
  estimated: boolean;
}

export function computeRunningPnl(params: {
  candles: Candle[];
  entryAt: Date;
  exitAt: Date | null;
  kind: "option" | "stock" | "other";
  direction: "long" | "short";
  /** underlying price at entry / exit (resolved from the chart) */
  entryUnderlying: number | null;
  exitUnderlying: number | null;
  /** per-unit premium (options) or share price (stocks) */
  avgEntryPrice: number | null;
  avgExitPrice: number | null;
  qty: number;
  realizedPnl: number;
}): RunningPnl | null {
  const {
    candles,
    entryAt,
    exitAt,
    kind,
    direction,
    entryUnderlying,
    exitUnderlying,
    avgEntryPrice,
    avgExitPrice,
    qty,
    realizedPnl,
  } = params;

  const end = exitAt ?? candles[candles.length - 1]?.ts ?? entryAt;
  const hold = candles.filter(
    (c) => c.ts.getTime() >= entryAt.getTime() && c.ts.getTime() <= end.getTime(),
  );
  if (hold.length < 2 || qty <= 0) return null;

  const isOption = kind === "option";
  const sign = direction === "long" ? 1 : -1;

  // Raw (unscaled) P/L shape from the price path.
  const raw: RunningPnlPoint[] = [];
  if (isOption) {
    if (
      entryUnderlying == null ||
      exitUnderlying == null ||
      avgEntryPrice == null ||
      avgExitPrice == null
    )
      return null;
    const denom = exitUnderlying - entryUnderlying;
    // Underlying barely moved — the premium change was mostly IV/theta we can't
    // model, so we'd be inventing the shape. Better to show nothing.
    if (Math.abs(denom) < entryUnderlying * 1e-4) return null;
    for (const c of hold) {
      const frac = (c.close - entryUnderlying) / denom;
      const premium = avgEntryPrice + (avgExitPrice - avgEntryPrice) * frac;
      raw.push({
        t: Math.floor(c.ts.getTime() / 1000),
        pnl: (premium - avgEntryPrice) * qty * 100,
        price: c.close,
      });
    }
  } else {
    const base = entryUnderlying ?? avgEntryPrice;
    if (base == null) return null;
    for (const c of hold) {
      raw.push({
        t: Math.floor(c.ts.getTime() / 1000),
        pnl: (c.close - base) * qty * sign,
        price: c.close,
      });
    }
  }

  // Anchor start to 0 and scale the exit to the true realized figure so the
  // curve is dollar-accurate at both ends regardless of fees/multiplier.
  const base = raw[0].pnl;
  const shifted = raw.map((p) => ({ ...p, pnl: p.pnl - base }));
  const rawExit = shifted[shifted.length - 1].pnl;
  const scale = Math.abs(rawExit) > 1e-9 ? realizedPnl / rawExit : 1;
  const points = shifted.map((p) => ({ ...p, pnl: p.pnl * scale }));
  points[points.length - 1].pnl = realizedPnl;

  let peak = points[0];
  let trough = points[0];
  let peakIdx = 0;
  let runMax = -Infinity;
  let maxDrawdown = 0;
  let underwaterCount = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.pnl > peak.pnl) {
      peak = p;
      peakIdx = i;
    }
    if (p.pnl < trough.pnl) trough = p;
    if (p.pnl > runMax) runMax = p.pnl;
    const dd = runMax - p.pnl;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (p.pnl < 0) underwaterCount++;
  }

  return {
    points,
    peak,
    trough,
    final: realizedPnl,
    maxDrawdown,
    giveback: Math.max(0, peak.pnl - realizedPnl),
    maxUnderwater: Math.max(0, -trough.pnl),
    timeUnderwaterPct: Math.round((underwaterCount / points.length) * 100),
    peakBeforeExit: peakIdx < points.length - 1,
    estimated: isOption,
  };
}
