import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brokerageAccounts, brokerageConnections, positions } from "@/lib/db/schema";
import type { ConnectionView } from "@/app/(app)/import/BrokerageCard";

/** Every query here is tenant-filtered. No unscoped variants. */

export async function getConnections(userId: string): Promise<ConnectionView[]> {
  const conns = await db
    .select()
    .from(brokerageConnections)
    .where(eq(brokerageConnections.userId, userId))
    .orderBy(desc(brokerageConnections.createdAt));
  if (conns.length === 0) return [];

  const accts = await db
    .select()
    .from(brokerageAccounts)
    .where(eq(brokerageAccounts.userId, userId))
    .orderBy(asc(brokerageAccounts.name));

  return conns.map((c) => ({
    id: c.id,
    institutionName: c.institutionName,
    status: c.status,
    lastSuccessfulSyncAt: c.lastSuccessfulSyncAt,
    accounts: accts
      .filter((a) => a.connectionId === c.id)
      .map((a) => ({
        id: a.id,
        name: a.name,
        number: a.number,
        balance: a.balance === null ? null : Number(a.balance),
        currency: a.currency,
        transactionsSynced: a.transactionsSynced,
      })),
  }));
}

export interface HoldingView {
  id: string;
  symbol: string;
  description: string | null;
  kind: "option" | "stock" | "other";
  optionType: "call" | "put" | null;
  strike: number | null;
  expiry: Date | null;
  quantity: number;
  averageCost: number | null;
  lastPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  accountName: string | null;
}

export interface PortfolioView {
  holdings: HoldingView[];
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  cash: number;
  hasConnection: boolean;
  lastSyncAt: Date | null;
}

export async function getPortfolio(userId: string): Promise<PortfolioView> {
  const rows = await db
    .select({
      id: positions.id,
      symbol: positions.symbol,
      description: positions.description,
      kind: positions.kind,
      optionType: positions.optionType,
      strike: positions.strike,
      expiry: positions.expiry,
      quantity: positions.quantity,
      averageCost: positions.averageCost,
      lastPrice: positions.lastPrice,
      marketValue: positions.marketValue,
      unrealizedPnl: positions.unrealizedPnl,
      accountName: brokerageAccounts.name,
    })
    .from(positions)
    .innerJoin(brokerageAccounts, eq(brokerageAccounts.id, positions.accountId))
    .where(eq(positions.userId, userId));

  const accts = await db
    .select()
    .from(brokerageAccounts)
    .where(eq(brokerageAccounts.userId, userId));

  const holdings: HoldingView[] = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    description: r.description,
    kind: r.kind,
    optionType: r.optionType,
    strike: r.strike === null ? null : Number(r.strike),
    expiry: r.expiry,
    quantity: Number(r.quantity),
    averageCost: r.averageCost === null ? null : Number(r.averageCost),
    lastPrice: r.lastPrice === null ? null : Number(r.lastPrice),
    marketValue: r.marketValue === null ? null : Number(r.marketValue),
    unrealizedPnl: r.unrealizedPnl === null ? null : Number(r.unrealizedPnl),
    accountName: r.accountName,
  }));

  holdings.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

  return {
    holdings,
    totalMarketValue: holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0),
    totalUnrealizedPnl: holdings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0),
    cash: accts.reduce((s, a) => s + Number(a.balance ?? 0), 0),
    hasConnection: accts.length > 0,
    lastSyncAt:
      accts.map((a) => a.lastSyncAt).filter(Boolean).sort().at(-1) ?? null,
  };
}
