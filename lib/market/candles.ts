import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceCandles } from "@/lib/db/schema";
import {
  AlpacaProvider,
  MassiveProvider,
  type Candle,
  type Interval,
  type MarketDataProvider,
} from "./provider";

/**
 * Candles come from the DB when we have them and the provider when we don't.
 * Past bars are immutable, so a cache hit is permanent — which is what keeps
 * the market-data bill from scaling with page views.
 */

export const marketDataConfigured = Boolean(
  process.env.MASSIVE_API_KEY ||
    (process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY),
);

function provider(): MarketDataProvider | null {
  if (process.env.MASSIVE_API_KEY) {
    return new MassiveProvider(process.env.MASSIVE_API_KEY);
  }
  if (process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY) {
    return new AlpacaProvider(
      process.env.ALPACA_KEY_ID,
      process.env.ALPACA_SECRET_KEY,
    );
  }
  return null;
}

/** Bar width that keeps a trade readable: ~40-150 candles across its span. */
export function intervalForSpan(fromMs: number, toMs: number): Interval {
  const hours = (toMs - fromMs) / 3_600_000;
  if (hours <= 8) return "1min";
  if (hours <= 48) return "5min";
  if (hours <= 24 * 10) return "1hour";
  return "1day";
}

export async function getCandles(
  symbol: string,
  interval: Interval,
  from: Date,
  to: Date,
): Promise<Candle[]> {
  const cached = await db
    .select()
    .from(priceCandles)
    .where(
      and(
        eq(priceCandles.symbol, symbol),
        eq(priceCandles.interval, interval),
        gte(priceCandles.ts, from),
        lte(priceCandles.ts, to),
      ),
    )
    .orderBy(asc(priceCandles.ts));

  if (cached.length > 0) {
    return cached.map((c) => ({
      ts: c.ts,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume === null ? null : Number(c.volume),
    }));
  }

  const p = provider();
  if (!p) return [];

  const bars = await p.getBars(symbol, interval, from, to);
  if (bars.length === 0) return [];

  for (let i = 0; i < bars.length; i += 500) {
    await db
      .insert(priceCandles)
      .values(
        bars.slice(i, i + 500).map((b) => ({
          symbol,
          interval,
          ts: b.ts,
          open: String(b.open),
          high: String(b.high),
          low: String(b.low),
          close: String(b.close),
          volume: b.volume === null ? null : String(b.volume),
          provider: p.name,
        })),
      )
      .onConflictDoNothing({
        target: [priceCandles.symbol, priceCandles.interval, priceCandles.ts],
      });
  }

  return bars;
}

export interface TradeChartData {
  candles: Candle[];
  interval: Interval;
  /** Underlying price at entry/exit — what the markers sit on. */
  entryPrice: number | null;
  exitPrice: number | null;
}

/**
 * Candles spanning a trade, padded so entry and exit aren't jammed against the
 * edges.
 *
 * Charts the *underlying*, not the option contract: fills are premiums (~$14)
 * while the underlying is ~$690, so they can't share an axis. The useful
 * question for a journal is "where in the underlying's move did I act?", and
 * that only needs equity bars.
 */
export async function getTradeChart(
  underlying: string,
  entryAt: Date,
  exitAt: Date | null,
): Promise<TradeChartData | null> {
  const end = exitAt ?? new Date();
  const spanMs = Math.max(end.getTime() - entryAt.getTime(), 60 * 60 * 1000);
  const pad = Math.max(spanMs * 0.35, 2 * 60 * 60 * 1000);

  const from = new Date(entryAt.getTime() - pad);
  const to = new Date(end.getTime() + pad);
  const interval = intervalForSpan(entryAt.getTime(), end.getTime());

  const candles = await getCandles(underlying, interval, from, to);
  if (candles.length === 0) return null;

  const at = (t: Date): number | null => {
    let best: Candle | null = null;
    let bestGap = Infinity;
    for (const c of candles) {
      const gap = Math.abs(c.ts.getTime() - t.getTime());
      if (gap < bestGap) {
        bestGap = gap;
        best = c;
      }
    }
    return best ? best.close : null;
  };

  return {
    candles,
    interval,
    entryPrice: at(entryAt),
    exitPrice: exitAt ? at(exitAt) : null,
  };
}
