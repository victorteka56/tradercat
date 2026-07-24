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
import { reconcileHoldings } from "./reconcile";

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
  /** Accounts whose history hit the page ceiling — history may be incomplete. */
  accountsTruncated: string[];
  /** Live holdings the broker reported but sent no opening fills for. */
  holdingsWithoutFills: number;
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
  const truncated: string[] = [];
  const granularity: { account: string; hasExecutionTimes: boolean }[] = [];

  for (const acct of accounts) {
    if (!acct.id) continue;
    liveAccountIds.push(acct.id);

    const authId = (acct as { brokerage_authorization?: string })
      .brokerage_authorization;
    const txSync = acct.sync_status?.transactions;
    const cash = await fetchCash(creds, acct.id);

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
        cash: n(cash),
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
          cash: n(cash),
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

    const history = await fetchAllActivities(creds, acct.id);
    if (history.truncated) truncated.push(acct.name ?? acct.id);

    const mapped = mapActivitiesToFills(history.activities, saved.id);
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

  // Fills alone can't prove a position is open — the broker may never have sent
  // its opening row. Let the live holdings snapshot fill those gaps.
  const reconciled = await reconcileHoldings(userId);

  return {
    connections: auths.length,
    accounts: accounts.length,
    positions: positionCount,
    fillsInserted,
    tradesUpserted: (recon?.tradesUpserted ?? 0) + reconciled.synthesized,
    holdingsWithoutFills: reconciled.synthesized,
    accountsStillBackfilling: backfilling,
    accountsTruncated: truncated,
    timeGranularity: granularity,
  };
}

/**
 * Settleable cash for an account, summed across currencies.
 *
 * `account.balance.total` is the account's TOTAL market value — cash plus every
 * holding — so using it as cash both mislabels it and double-counts the
 * positions when the two are added. The balances endpoint is the only source of
 * actual cash. Returns null when the brokerage doesn't supply it, so we show
 * nothing rather than a wrong zero.
 */
async function fetchCash(
  creds: { userId: string; userSecret: string },
  accountId: string,
): Promise<number | null> {
  try {
    const res = await snaptrade.accountInformation.getUserAccountBalance({
      userId: creds.userId,
      userSecret: creds.userSecret,
      accountId,
    });
    const rows = res.data ?? [];
    const withCash = rows.filter((b) => b.cash != null);
    if (withCash.length === 0) return null;
    return withCash.reduce((s, b) => s + Number(b.cash), 0);
  } catch {
    // Not every brokerage exposes balances — keep the rest of the sync working.
    return null;
  }
}

/** SnapTrade's page size for activities — also its default when you omit `limit`. */
const ACTIVITY_PAGE = 1000;
/** Safety stop: 100 pages = 100k activities. Guards against a bad `total`. */
const MAX_ACTIVITY_PAGES = 100;

/**
 * Reads an account's FULL transaction history.
 *
 * `getAccountActivities` is paginated and defaults to the first 1000 rows, which
 * are returned oldest-first. Fetching a single page therefore silently caps a
 * busy account at its first 1000 activities and drops everything newer — the
 * account looks synced while months of recent trades never arrive. Page until
 * the API stops giving us rows.
 */
async function fetchAllActivities(
  creds: { userId: string; userSecret: string },
  accountId: string,
): Promise<{ activities: unknown[]; truncated: boolean }> {
  const all: unknown[] = [];

  for (let page = 0; page < MAX_ACTIVITY_PAGES; page++) {
    const res = await snaptrade.accountInformation.getAccountActivities({
      userId: creds.userId,
      userSecret: creds.userSecret,
      accountId,
      offset: page * ACTIVITY_PAGE,
      limit: ACTIVITY_PAGE,
    });

    const body = res.data as
      | { data?: unknown[]; pagination?: { total?: number } }
      | unknown[];
    const batch = Array.isArray(body) ? body : body?.data ?? [];
    all.push(...batch);

    // A short page is the last page. `total` lets us stop on an exact boundary
    // instead of spending a round-trip to discover an empty page.
    const total = Array.isArray(body) ? undefined : body?.pagination?.total;
    if (batch.length < ACTIVITY_PAGE) return { activities: all, truncated: false };
    if (typeof total === "number" && all.length >= total) {
      return { activities: all, truncated: false };
    }
  }

  return { activities: all, truncated: true };
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
      // `crypto`, `cs`, `et`, … — the only signal that separates a coin from an
      // equity, since both arrive through the same holdings endpoint.
      securityType: sym?.type?.code ?? null,
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
