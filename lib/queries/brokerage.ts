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

/** Shares per option contract — the standard equity-option multiplier. */
const OPTION_MULTIPLIER = 100;

/** How a holding is grouped and coloured across the portfolio page. */
export type AssetClass = "option" | "stock" | "fund" | "crypto";

/** SnapTrade type codes that are funds rather than plain equity. */
const FUND_CODES = new Set(["et", "oef", "cef", "ut"]);

function classify(kind: string, securityType: string | null): AssetClass {
  if (kind === "option") return "option";
  const t = (securityType ?? "").toLowerCase();
  if (t === "crypto") return "crypto";
  if (FUND_CODES.has(t)) return "fund";
  return "stock";
}

export interface HoldingView {
  id: string;
  symbol: string;
  description: string | null;
  kind: "option" | "stock" | "other";
  assetClass: AssetClass;
  optionType: "call" | "put" | null;
  strike: number | null;
  expiry: Date | null;
  quantity: number;
  /** Per share, always — options are divided down from SnapTrade's per-contract value. */
  averageCost: number | null;
  lastPrice: number | null;
  marketValue: number | null;
  /** What the position cost to open. Null when the broker reports no average. */
  costBasis: number | null;
  unrealizedPnl: number | null;
  /** Return on cost basis, in percent. */
  unrealizedPct: number | null;
  accountName: string | null;
  /** Brokerage that holds it — the badge shown in the holdings table. */
  institutionName: string | null;
}

/** One connected account, for the "where it's held" breakdown. */
export interface AccountView {
  id: string;
  name: string | null;
  institutionName: string | null;
  /** Total account value as the brokerage reports it. */
  value: number;
  cash: number | null;
  positions: number;
}

export interface PortfolioView {
  holdings: HoldingView[];
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  /** Settleable cash. Null when no connected brokerage reports it. */
  cash: number | null;
  /**
   * Total account value as the brokerages themselves report it. Preferred over
   * cash + holdings: it stays right even if an asset class doesn't sync.
   */
  totalValue: number;
  accounts: AccountView[];
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
      securityType: positions.securityType,
      accountId: positions.accountId,
      accountName: brokerageAccounts.name,
      institutionName: brokerageAccounts.institutionName,
    })
    .from(positions)
    .innerJoin(brokerageAccounts, eq(brokerageAccounts.id, positions.accountId))
    .where(eq(positions.userId, userId));

  const accts = await db
    .select()
    .from(brokerageAccounts)
    .where(eq(brokerageAccounts.userId, userId));

  const holdings: HoldingView[] = rows.map((r) => {
    const qty = Number(r.quantity);
    const marketValue = r.marketValue === null ? null : Number(r.marketValue);

    // SnapTrade quotes an option's `price` per share but its
    // `average_purchase_price` per CONTRACT. Normalise to per share so a
    // holding's average is directly comparable to its last price.
    const multiplier = r.kind === "option" ? OPTION_MULTIPLIER : 1;
    const rawAvg = r.averageCost === null ? null : Number(r.averageCost);
    const averageCost = rawAvg === null ? null : rawAvg / multiplier;
    const costBasis = averageCost === null ? null : averageCost * qty * multiplier;

    // Brokers routinely omit open P/L on option holdings, which silently
    // understates the portfolio total. Market value minus cost basis is the
    // same number, so derive it rather than showing nothing.
    const reported = r.unrealizedPnl === null ? null : Number(r.unrealizedPnl);
    const unrealizedPnl =
      reported ?? (marketValue !== null && costBasis !== null ? marketValue - costBasis : null);

    return {
      id: r.id,
      symbol: r.symbol,
      description: r.description,
      kind: r.kind,
      assetClass: classify(r.kind, r.securityType),
      optionType: r.optionType,
      strike: r.strike === null ? null : Number(r.strike),
      expiry: r.expiry,
      quantity: qty,
      averageCost,
      lastPrice: r.lastPrice === null ? null : Number(r.lastPrice),
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPct:
        unrealizedPnl !== null && costBasis !== null && costBasis > 0
          ? (unrealizedPnl / costBasis) * 100
          : null,
      accountName: r.accountName,
      institutionName: r.institutionName,
    };
  });

  holdings.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

  return {
    holdings,
    totalMarketValue: holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0),
    totalCostBasis: holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0),
    totalUnrealizedPnl: holdings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0),
    // `balance` is the account TOTAL (cash + holdings), never cash — summing it
    // as cash and then adding holdings counted every position twice.
    cash: accts.some((a) => a.cash !== null)
      ? accts.reduce((s, a) => s + Number(a.cash ?? 0), 0)
      : null,
    totalValue: accts.reduce((s, a) => s + Number(a.balance ?? 0), 0),
    accounts: accts
      .map((a) => ({
        id: a.id,
        name: a.name,
        institutionName: a.institutionName,
        value: Number(a.balance ?? 0),
        cash: a.cash === null ? null : Number(a.cash),
        positions: rows.filter((r) => r.accountId === a.id).length,
      }))
      .sort((x, y) => y.value - x.value),
    hasConnection: accts.length > 0,
    lastSyncAt:
      accts.map((a) => a.lastSyncAt).filter(Boolean).sort().at(-1) ?? null,
  };
}
