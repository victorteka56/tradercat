import "server-only";

import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brokerageAccounts,
  brokerageConnections,
  positions,
} from "@/lib/db/schema";
import { getCreds, snaptrade } from "./client";
import { mapActivitiesToFills } from "./activities";
import { ingestBrokerageFills, runReconstruction } from "@/lib/import/pipeline";

const n = (v: unknown): string | null =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? null : String(v);

export interface SyncOutcome {
  connections: number;
  accounts: number;
  positions: number;
  fillsInserted: number;
  tradesUpserted: number;
  /** Accounts whose transaction history the broker hasn't finished sending. */
  accountsStillBackfilling: string[];
  /** Per-account: does this broker actually supply execution times? */
  timeGranularity: { account: string; hasExecutionTimes: boolean }[];
}

/**
 * Pulls connections, accounts and holdings for a user.
 *
 * Holdings are a snapshot, not a ledger: each sync replaces the account's
 * positions wholesale, so a closed position disappears instead of lingering.
 * Trades/fills are a separate concern — they come from activities.
 */
export async function syncBrokerageData(userId: string): Promise<SyncOutcome> {
  const creds = await getCreds(userId);
  if (!creds) throw new Error("This account isn't registered with SnapTrade yet.");

  const now = new Date();

  /* ---- connections ---- */
  const auths = (
    await snaptrade.connections.listBrokerageAuthorizations({
      userId: creds.userId,
      userSecret: creds.userSecret,
    })
  ).data;

  const connIdByAuth = new Map<string, string>();
  for (const a of auths) {
    if (!a.id) continue;
    const [row] = await db
      .insert(brokerageConnections)
      .values({
        userId,
        provider: "snaptrade",
        authorizationId: a.id,
        institutionName: a.brokerage?.name ?? null,
        status: a.disabled ? "disabled" : "active",
        lastSyncAt: now,
        lastSuccessfulSyncAt: now,
      })
      .onConflictDoUpdate({
        target: [brokerageConnections.userId, brokerageConnections.authorizationId],
        set: {
          institutionName: a.brokerage?.name ?? null,
          status: a.disabled ? "disabled" : "active",
          lastSyncAt: now,
          lastSuccessfulSyncAt: now,
        },
      })
      .returning({ id: brokerageConnections.id });
    connIdByAuth.set(a.id, row.id);
  }

  // Connections removed at SnapTrade should disappear here too.
  const liveAuthIds = auths.map((a) => a.id).filter(Boolean) as string[];
  if (liveAuthIds.length) {
    await db
      .delete(brokerageConnections)
      .where(
        and(
          eq(brokerageConnections.userId, userId),
          notInArray(brokerageConnections.authorizationId, liveAuthIds),
        ),
      );
  } else {
    await db.delete(brokerageConnections).where(eq(brokerageConnections.userId, userId));
  }

  /* ---- accounts ---- */
  const accounts = (
    await snaptrade.accountInformation.listUserAccounts({
      userId: creds.userId,
      userSecret: creds.userSecret,
    })
  ).data;

  let positionCount = 0;
  let fillsInserted = 0;
  const liveAccountIds: string[] = [];
  const backfilling: string[] = [];
  const granularity: { account: string; hasExecutionTimes: boolean }[] = [];

  for (const acct of accounts) {
    if (!acct.id) continue;
    liveAccountIds.push(acct.id);

    const authId = (acct as { brokerage_authorization?: string })
      .brokerage_authorization;
    const txSync = acct.sync_status?.transactions;

    const [saved] = await db
      .insert(brokerageAccounts)
      .values({
        userId,
        connectionId: authId ? connIdByAuth.get(authId) ?? null : null,
        externalId: acct.id,
        name: acct.name ?? null,
        number: acct.number ?? null,
        institutionName: acct.institution_name ?? null,
        currency: acct.balance?.total?.currency ?? null,
        balance: n(acct.balance?.total?.amount),
        transactionsSynced: txSync?.initial_sync_completed ? now : null,
        lastSyncAt: now,
      })
      .onConflictDoUpdate({
        target: [brokerageAccounts.userId, brokerageAccounts.externalId],
        set: {
          connectionId: authId ? connIdByAuth.get(authId) ?? null : null,
          name: acct.name ?? null,
          number: acct.number ?? null,
          institutionName: acct.institution_name ?? null,
          currency: acct.balance?.total?.currency ?? null,
          balance: n(acct.balance?.total?.amount),
          transactionsSynced: txSync?.initial_sync_completed ? now : null,
          lastSyncAt: now,
        },
      })
      .returning({ id: brokerageAccounts.id });

    positionCount += await syncPositionsForAccount(
      userId,
      saved.id,
      acct.id,
      creds,
      now,
    );

    // Trade history only exists once the broker finishes its initial backfill.
    // Say so rather than silently reporting zero trades.
    if (!txSync?.initial_sync_completed) {
      backfilling.push(acct.name ?? acct.id);
      continue;
    }

    const res = await snaptrade.accountInformation.getAccountActivities({
      userId: creds.userId,
      userSecret: creds.userSecret,
      accountId: acct.id,
    });
    const activities =
      (res.data as { data?: unknown[] })?.data ??
      (Array.isArray(res.data) ? (res.data as unknown[]) : []);

    const mapped = mapActivitiesToFills(activities, saved.id);
    granularity.push({
      account: acct.name ?? acct.id,
      hasExecutionTimes: mapped.hasExecutionTimes,
    });

    if (mapped.fills.length) {
      const out = await ingestBrokerageFills(userId, saved.id, mapped.fills);
      fillsInserted += out.inserted;
    }
  }

  if (liveAccountIds.length) {
    await db
      .delete(brokerageAccounts)
      .where(
        and(
          eq(brokerageAccounts.userId, userId),
          notInArray(brokerageAccounts.externalId, liveAccountIds),
        ),
      );
  }

  // Rebuild once at the end — reconstruction reads every fill the user has, so
  // running it per account would repeat the same work.
  const recon = fillsInserted > 0 ? await runReconstruction(userId, "sync") : null;

  return {
    connections: auths.length,
    accounts: accounts.length,
    positions: positionCount,
    fillsInserted,
    tradesUpserted: recon?.tradesUpserted ?? 0,
    accountsStillBackfilling: backfilling,
    timeGranularity: granularity,
  };
}

async function syncPositionsForAccount(
  userId: string,
  accountRowId: string,
  externalAccountId: string,
  creds: { userId: string; userSecret: string },
  now: Date,
): Promise<number> {
  const args = {
    userId: creds.userId,
    userSecret: creds.userSecret,
    accountId: externalAccountId,
  };

  const rows: (typeof positions.$inferInsert)[] = [];

  const equity = (
    await snaptrade.accountInformation.getUserAccountPositions(args)
  ).data;

  for (const p of equity) {
    const sym = p.symbol?.symbol;
    const ticker = sym?.symbol;
    if (!ticker) continue;
    const units = Number(p.units ?? 0);
    const price = p.price == null ? null : Number(p.price);
    rows.push({
      userId,
      accountId: accountRowId,
      positionKey: `stk:${ticker}`,
      symbol: ticker,
      description: sym?.description ?? null,
      kind: "stock",
      quantity: String(units),
      averageCost: n(p.average_purchase_price),
      lastPrice: n(price),
      marketValue: price != null ? (units * price).toFixed(2) : null,
      unrealizedPnl: n(p.open_pnl),
      currency: sym?.currency?.code ?? null,
      asOf: now,
    });
  }

  // Options live behind a separate endpoint; not every brokerage supports it.
  try {
    const opts =
      (await snaptrade.options.listOptionHoldings(args)).data ?? [];
    for (const o of opts) {
      const os = (o as { symbol?: { option_symbol?: Record<string, unknown> } })
        .symbol?.option_symbol;
      const ticker = os?.ticker as string | undefined;
      const underlying =
        ((os?.underlying_symbol as { symbol?: string })?.symbol) ?? ticker;
      if (!ticker || !underlying) continue;
      const rawType = String(os?.option_type ?? "").toLowerCase();
      const optionType = rawType === "call" || rawType === "put" ? rawType : null;
      const strike = os?.strike_price == null ? null : Number(os.strike_price);
      const expiry = os?.expiration_date
        ? new Date(String(os.expiration_date))
        : null;
      const units = Number(o.units ?? 0);
      const price = o.price == null ? null : Number(o.price);
      rows.push({
        userId,
        accountId: accountRowId,
        positionKey: `opt:${ticker}`,
        symbol: underlying,
        description: ticker,
        kind: "option",
        optionType,
        strike: n(strike),
        expiry,
        quantity: String(units),
        averageCost: n(o.average_purchase_price),
        lastPrice: n(price),
        // Option quotes are per share; a standard contract is 100 shares.
        marketValue: price != null ? (units * price * 100).toFixed(2) : null,
        currency: o.currency?.code ?? null,
        asOf: now,
      });
    }
  } catch {
    // Brokerage doesn't expose option holdings — equities still sync.
  }

  // Snapshot semantics: replace, don't merge.
  await db.delete(positions).where(eq(positions.accountId, accountRowId));
  if (rows.length) await db.insert(positions).values(rows);
  return rows.length;
}

/** Removes a connection at SnapTrade and locally. */
export async function disconnectBrokerage(userId: string, connectionId: string) {
  const creds = await getCreds(userId);
  if (!creds) return;

  const [conn] = await db
    .select()
    .from(brokerageConnections)
    .where(
      and(
        eq(brokerageConnections.id, connectionId),
        eq(brokerageConnections.userId, userId),
      ),
    )
    .limit(1);
  if (!conn) return; // not this user's connection — say nothing

  await snaptrade.connections.removeBrokerageAuthorization({
    userId: creds.userId,
    userSecret: creds.userSecret,
    authorizationId: conn.authorizationId,
  });

  await db.delete(brokerageConnections).where(eq(brokerageConnections.id, conn.id));
}
