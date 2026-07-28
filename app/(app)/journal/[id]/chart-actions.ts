"use server";

import { requireUser } from "@/lib/auth";
import { getCandles } from "@/lib/market/candles";
import type { Interval } from "@/lib/market/provider";

export interface ActionCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

/**
 * Candles for a symbol/window at a chosen interval — powers the chart's
 * timeframe switch. Gated on auth (public market data, but no reason to serve it
 * anonymously) and results are cached per interval in price_candles.
 */
export async function fetchTradeCandles(
  symbol: string,
  fromMs: number,
  toMs: number,
  interval: Interval,
): Promise<ActionCandle[]> {
  await requireUser();
  const candles = await getCandles(symbol, interval, new Date(fromMs), new Date(toMs));
  return candles.map((c) => ({
    time: Math.floor(c.ts.getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}
