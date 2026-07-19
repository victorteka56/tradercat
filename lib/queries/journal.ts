import "server-only";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brokerageAccounts,
  fills,
  importBatches,
  tradeLegs,
  tradeNotes,
  trades,
} from "@/lib/db/schema";

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
  fees: number;
  grossPnl: number | null;
  netPnl: number;
  entryAt: Date | null;
  exitAt: Date | null;
  holdingSeconds: number | null;
  rMultiple: number | null;
  /** Return on cost: netPnl / cost × 100. Null for open/incomplete/no-cost. */
  pnlPct: number | null;
  riskSource: "stop" | "manual" | "inferred" | null;
  mae: number | null;
  mfe: number | null;
  capturedPct: number | null;
  /** Where this trade came from — drives the broker badge. */
  source: "robinhood_csv" | "snaptrade" | "other_csv";
  brokerName: string | null;
  /** Opening fills missing → P/L unreliable, excluded from totals. */
  incomplete: boolean;
}

const toNum = (v: string | null): number | null => (v === null ? null : Number(v));

/**
 * A trade needs at least this much cost basis for a return % to mean anything.
 * A few cents of basis (a fractional reinvested share) divides into a real
 * dollar figure to produce absurd four-digit percentages, so we suppress those.
 */
const MIN_COST_BASIS = 1;

function mapTrade(
  r: typeof trades.$inferSelect,
  brokerName: string | null = null,
): JournalTrade {
  return {
    source: r.source,
    brokerName,
    incomplete: r.incomplete,
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
    fees: Number(r.fees ?? "0"),
    grossPnl: r.grossPnl === null ? null : Number(r.grossPnl),
    netPnl: Number(r.netPnl ?? "0"),
    entryAt: r.entryAt,
    exitAt: r.exitAt,
    holdingSeconds: r.holdingSeconds,
    rMultiple: toNum(r.rMultiple),
    // Return on cost — only meaningful for a completed trade with a real cost.
    pnlPct:
      !r.incomplete && r.status === "closed" && Number(r.cost) >= MIN_COST_BASIS
        ? (Number(r.netPnl ?? "0") / Number(r.cost)) * 100
        : null,
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
    .select({ trade: trades, brokerName: brokerageAccounts.institutionName })
    .from(trades)
    // Left join: CSV-imported trades have no account and must still appear.
    .leftJoin(brokerageAccounts, eq(brokerageAccounts.id, trades.accountId))
    .where(eq(trades.userId, userId))
    // Latest first; trades with no known date sort last, not first (Postgres
    // defaults DESC to NULLS FIRST, which floated dateless trades to the top).
    .orderBy(sql`coalesce(${trades.exitAt}, ${trades.entryAt}) desc nulls last`)
    .limit(opts.limit ?? 2000);
  return rows.map((r) => mapTrade(r.trade, r.brokerName));
}

export async function getTradeById(
  userId: string,
  tradeId: string,
): Promise<JournalTrade | null> {
  const rows = await db
    .select({ trade: trades, brokerName: brokerageAccounts.institutionName })
    .from(trades)
    .leftJoin(brokerageAccounts, eq(brokerageAccounts.id, trades.accountId))
    // Tenant filter is part of the lookup, not an afterthought — a valid id
    // from another user must not resolve.
    .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)))
    .limit(1);
  return rows[0] ? mapTrade(rows[0].trade, rows[0].brokerName) : null;
}

/** The user's free-text note for a trade ("" when none). One note per trade. */
export async function getTradeNote(
  userId: string,
  tradeId: string,
): Promise<string> {
  const [row] = await db
    .select({ body: tradeNotes.body })
    .from(tradeNotes)
    .where(and(eq(tradeNotes.userId, userId), eq(tradeNotes.tradeId, tradeId)))
    .orderBy(desc(tradeNotes.createdAt))
    .limit(1);
  return row?.body ?? "";
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
  incompleteTrades: number;
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
  // Incomplete trades (missing cost basis) are excluded from every P/L figure —
  // their proceeds-only "profit" would badly skew the totals.
  const complete = sql`${trades.incomplete} = false`;
  const [row] = await db
    .select({
      totalTrades: sql<string>`count(*)`,
      closedTrades: sql<string>`count(*) filter (where ${trades.status} = 'closed' and ${complete})`,
      openTrades: sql<string>`count(*) filter (where ${trades.status} = 'open')`,
      incompleteTrades: sql<string>`count(*) filter (where ${trades.incomplete})`,
      netPnl: sql<string>`coalesce(sum(${trades.netPnl}) filter (where ${complete}), 0)`,
      winners: sql<string>`count(*) filter (where ${trades.status} = 'closed' and ${complete} and ${trades.netPnl} > 0)`,
      losers: sql<string>`count(*) filter (where ${trades.status} = 'closed' and ${complete} and ${trades.netPnl} < 0)`,
      grossWin: sql<string>`coalesce(sum(${trades.netPnl}) filter (where ${trades.status} = 'closed' and ${complete} and ${trades.netPnl} > 0), 0)`,
      grossLoss: sql<string>`coalesce(sum(${trades.netPnl}) filter (where ${trades.status} = 'closed' and ${complete} and ${trades.netPnl} < 0), 0)`,
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
    incompleteTrades: Number(row?.incompleteTrades ?? 0),
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

export interface RealizedPoint {
  /** exit timestamp, epoch ms */
  t: number;
  /** realized P/L booked by this trade */
  pnl: number;
}

/**
 * Every realized trade as a {time, pnl} point, oldest first. Deliberately
 * compact — the client builds the cumulative equity curve and any date-range
 * slice from this, so switching 24H/1W/1M/YTD/ALL needs no round-trip.
 */
export async function getRealizedSeries(userId: string): Promise<RealizedPoint[]> {
  const rows = await db
    .select({ exitAt: trades.exitAt, netPnl: trades.netPnl })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.status, "closed"),
        eq(trades.incomplete, false),
        sql`${trades.exitAt} is not null`,
      ),
    )
    .orderBy(trades.exitAt);
  return rows.map((r) => ({
    t: new Date(r.exitAt as Date).getTime(),
    pnl: Number(r.netPnl ?? "0"),
  }));
}

export interface TradeHighlights {
  biggestGain: JournalTrade | null;
  biggestLoss: JournalTrade | null;
  bestReturn: JournalTrade | null;
  worstReturn: JournalTrade | null;
}

/**
 * The four extreme trades for the header highlight cards. Realized (complete,
 * closed) trades only — an open or incomplete trade has no final figure to
 * rank. The return-ranked cards additionally require a real cost basis.
 */
export async function getTradeHighlights(userId: string): Promise<TradeHighlights> {
  const closed = and(
    eq(trades.userId, userId),
    eq(trades.status, "closed"),
    eq(trades.incomplete, false),
  );
  const withCost = and(closed, sql`${trades.cost} >= ${MIN_COST_BASIS}`);

  const pick = async (
    where: SQL | undefined,
    order: SQL,
  ): Promise<JournalTrade | null> => {
    const [r] = await db.select().from(trades).where(where).orderBy(order).limit(1);
    return r ? mapTrade(r) : null;
  };

  const [biggestGain, biggestLoss, bestReturn, worstReturn] = await Promise.all([
    pick(closed, sql`${trades.netPnl} desc nulls last`),
    pick(closed, sql`${trades.netPnl} asc nulls last`),
    pick(withCost, sql`${trades.netPnl} / ${trades.cost} desc`),
    pick(withCost, sql`${trades.netPnl} / ${trades.cost} asc`),
  ]);

  return { biggestGain, biggestLoss, bestReturn, worstReturn };
}

export interface DailyPnl {
  /** YYYY-MM-DD in market time (ET). */
  day: string;
  trades: number;
  pnl: number;
}

/**
 * Per-day realized P/L for the calendar, keyed by the ET date a trade closed.
 * Complete closed trades only — open and incomplete trades have no reliable
 * realized figure to place on a day.
 */
export async function getDailyPnl(userId: string): Promise<DailyPnl[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(${trades.exitAt} at time zone 'America/New_York', 'YYYY-MM-DD')`,
      trades: sql<string>`count(*)`,
      pnl: sql<string>`coalesce(sum(${trades.netPnl}), 0)`,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.status, "closed"),
        eq(trades.incomplete, false),
        sql`${trades.exitAt} is not null`,
      ),
    )
    .groupBy(sql`1`);

  return rows.map((r) => ({
    day: r.day,
    trades: Number(r.trades),
    pnl: Number(r.pnl),
  }));
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
