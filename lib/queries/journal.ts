import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { fills, importBatches, tradeLegs, trades } from "@/lib/db/schema";

/**
 * Every query here takes userId and filters on it. Never export a helper that
 * can read trades without a tenant filter.
 *
 * Money aggregates are computed in SQL because Postgres numeric is exact —
 * summing thousands of fills in JS floats would drift.
 */

export interface JournalTrade {
  id: string;
  symbol: string;
  description: string | null;
  kind: "option" | "stock" | "other";
  direction: "long" | "short";
  status: "open" | "closed";
  optionType: "call" | "put" | null;
  strike: number | null;
  expiry: Date | null;
  openedQty: number;
  closedQty: number;
  avgEntryPrice: number | null;
  avgExitPrice: number | null;
  cost: number;
  proceeds: number;
  netPnl: number;
  entryAt: Date | null;
  exitAt: Date | null;
  holdingSeconds: number | null;
  rMultiple: number | null;
  riskSource: "stop" | "manual" | "inferred" | null;
  mae: number | null;
  mfe: number | null;
  capturedPct: number | null;
}

const toNum = (v: string | null): number | null => (v === null ? null : Number(v));

function mapTrade(r: typeof trades.$inferSelect): JournalTrade {
  return {
    id: r.id,
    symbol: r.symbol,
    description: r.description,
    kind: r.kind,
    direction: r.direction,
    status: r.status,
    optionType: r.optionType,
    strike: toNum(r.strike),
    expiry: r.expiry,
    openedQty: Number(r.openedQty),
    closedQty: Number(r.closedQty),
    avgEntryPrice: toNum(r.avgEntryPrice),
    avgExitPrice: toNum(r.avgExitPrice),
    cost: Number(r.cost),
    proceeds: Number(r.proceeds),
    netPnl: Number(r.netPnl ?? "0"),
    entryAt: r.entryAt,
    exitAt: r.exitAt,
    holdingSeconds: r.holdingSeconds,
    rMultiple: toNum(r.rMultiple),
    riskSource: r.riskSource,
    mae: toNum(r.mae),
    mfe: toNum(r.mfe),
    capturedPct: toNum(r.capturedPct),
  };
}

export async function getTrades(
  userId: string,
  opts: { limit?: number } = {},
): Promise<JournalTrade[]> {
  const rows = await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(sql`coalesce(${trades.exitAt}, ${trades.entryAt})`))
    .limit(opts.limit ?? 1000);
  return rows.map(mapTrade);
}

export async function getTradeById(
  userId: string,
  tradeId: string,
): Promise<JournalTrade | null> {
  const rows = await db
    .select()
    .from(trades)
    // Tenant filter is part of the lookup, not an afterthought — a valid id
    // from another user must not resolve.
    .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)))
    .limit(1);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export interface TradeFill {
  id: string;
  code: string;
  quantity: number;
  price: number | null;
  amount: number;
  executedAt: Date;
  legType: "entry" | "exit";
}

export async function getTradeFills(
  userId: string,
  tradeId: string,
): Promise<TradeFill[]> {
  const rows = await db
    .select({
      id: fills.id,
      code: fills.code,
      quantity: fills.quantity,
      price: fills.price,
      amount: fills.amount,
      executedAt: fills.executedAt,
      legType: tradeLegs.legType,
    })
    .from(tradeLegs)
    .innerJoin(fills, eq(fills.id, tradeLegs.fillId))
    .where(and(eq(tradeLegs.tradeId, tradeId), eq(tradeLegs.userId, userId)))
    .orderBy(desc(fills.executedAt));
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    quantity: Number(r.quantity),
    price: r.price === null ? null : Number(r.price),
    amount: Number(r.amount),
    executedAt: r.executedAt,
    legType: r.legType,
  }));
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  netPnl: number;
  winners: number;
  losers: number;
  winRate: number;
  avgWinner: number;
  avgLoser: number;
  profitFactor: number | null;
  optionTrades: number;
  stockTrades: number;
}

export async function getJournalStats(userId: string): Promise<JournalStats> {
  const [row] = await db
    .select({
      totalTrades: sql<string>`count(*)`,
      closedTrades: sql<string>`count(*) filter (where ${trades.status} = 'closed')`,
      openTrades: sql<string>`count(*) filter (where ${trades.status} = 'open')`,
      netPnl: sql<string>`coalesce(sum(${trades.netPnl}), 0)`,
      winners: sql<string>`count(*) filter (where ${trades.status} = 'closed' and ${trades.netPnl} > 0)`,
      losers: sql<string>`count(*) filter (where ${trades.status} = 'closed' and ${trades.netPnl} < 0)`,
      grossWin: sql<string>`coalesce(sum(${trades.netPnl}) filter (where ${trades.status} = 'closed' and ${trades.netPnl} > 0), 0)`,
      grossLoss: sql<string>`coalesce(sum(${trades.netPnl}) filter (where ${trades.status} = 'closed' and ${trades.netPnl} < 0), 0)`,
      optionTrades: sql<string>`count(*) filter (where ${trades.kind} = 'option')`,
      stockTrades: sql<string>`count(*) filter (where ${trades.kind} = 'stock')`,
    })
    .from(trades)
    .where(eq(trades.userId, userId));

  const winners = Number(row?.winners ?? 0);
  const losers = Number(row?.losers ?? 0);
  const closed = Number(row?.closedTrades ?? 0);
  const grossWin = Number(row?.grossWin ?? 0);
  const grossLoss = Math.abs(Number(row?.grossLoss ?? 0));

  return {
    totalTrades: Number(row?.totalTrades ?? 0),
    closedTrades: closed,
    openTrades: Number(row?.openTrades ?? 0),
    netPnl: Number(row?.netPnl ?? 0),
    winners,
    losers,
    winRate: closed ? Math.round((winners / closed) * 100) : 0,
    avgWinner: winners ? grossWin / winners : 0,
    avgLoser: losers ? -grossLoss / losers : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    optionTrades: Number(row?.optionTrades ?? 0),
    stockTrades: Number(row?.stockTrades ?? 0),
  };
}

/**
 * Cumulative realized P/L over closed trades, downsampled for the sparkline.
 * The running total is computed in SQL so the numeric math stays exact.
 */
export async function getEquityCurve(
  userId: string,
  maxPoints = 40,
): Promise<number[]> {
  const rows = await db
    .select({
      cum: sql<string>`sum(${trades.netPnl}) over (order by ${trades.exitAt}, ${trades.id})`,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.status, "closed"),
        sql`${trades.exitAt} is not null`,
      ),
    )
    .orderBy(trades.exitAt, trades.id);

  if (rows.length === 0) return [];
  const values = rows.map((r) => Number(r.cum));
  if (values.length <= maxPoints) return [0, ...values];

  const step = (values.length - 1) / (maxPoints - 1);
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(values[Math.round(i * step)]);
  return [0, ...out];
}

export async function hasAnyTrades(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<string>`count(*)` })
    .from(trades)
    .where(eq(trades.userId, userId))
    .limit(1);
  return Number(row?.n ?? 0) > 0;
}

export interface ImportSummaryRow {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "failed";
  rowCount: number;
  errorCount: number;
  createdAt: Date;
}

export async function getRecentImports(
  userId: string,
  limit = 5,
): Promise<ImportSummaryRow[]> {
  return db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      status: importBatches.status,
      rowCount: importBatches.rowCount,
      errorCount: importBatches.errorCount,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.userId, userId))
    .orderBy(desc(importBatches.createdAt))
    .limit(limit);
}
