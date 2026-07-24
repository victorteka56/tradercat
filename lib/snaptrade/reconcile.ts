import "server-only";

import { and, eq, like, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { positions, trades } from "@/lib/db/schema";

/**
 * Reconciles the broker's live holdings against the trades we rebuilt from fills.
 *
 * Reconstruction can only call a position open when its OPENING fill is in the
 * activity feed. Brokers don't always supply one: SnapTrade's history has a
 * start date, some brokers lag on recent option activity, and a position opened
 * before the window simply has no opening row. The holdings endpoint, though,
 * is authoritative — if the broker says you hold 10 contracts, you hold them.
 *
 * So any live holding that no open trade accounts for gets a stand-in trade
 * under a `hold:` group key, which keeps it clear of the `acct:` keys
 * reconstruction owns — the two can never collide or clobber each other. Once
 * the real fills do arrive, reconstruction produces the genuine trade and the
 * stand-in is dropped on the next sync.
 *
 * Snapshot semantics, same as `positions` itself: stand-ins are rebuilt from
 * the current holdings every sync, never merged.
 */

const OPTION_MULTIPLIER = 100;

const day = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

/** Identifies an instrument within an account, for matching holdings to trades. */
const instrumentKey = (p: {
  accountId: string | null;
  kind: string;
  symbol: string;
  optionType: string | null;
  strike: string | number | null;
  expiry: Date | null;
}): string =>
  p.kind === "option"
    ? `${p.accountId}|opt:${p.symbol}:${p.optionType}:${Number(p.strike)}:${day(p.expiry)}`
    : `${p.accountId}|stk:${p.symbol}`;

export interface ReconcileOutcome {
  /** Holdings the broker reports that no reconstructed trade covered. */
  synthesized: number;
  /** Stand-ins dropped because the position closed or real fills arrived. */
  removed: number;
}

export async function reconcileHoldings(userId: string): Promise<ReconcileOutcome> {
  const [live, open] = await Promise.all([
    db.select().from(positions).where(eq(positions.userId, userId)),
    db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "open"))),
  ]);

  // Only trades rebuilt from real fills count as coverage — a previous sync's
  // stand-in must not make itself look covered.
  const covered = new Set(
    open.filter((t) => !t.groupKey.startsWith("hold:")).map(instrumentKey),
  );

  const rows: (typeof trades.$inferInsert)[] = [];

  for (const p of live) {
    const qty = Number(p.quantity);
    if (!Number.isFinite(qty) || qty === 0) continue;
    if (covered.has(instrumentKey(p))) continue;

    const avgCost = p.averageCost === null ? null : Number(p.averageCost);
    const size = Math.abs(qty);
    const multiplier = p.kind === "option" ? OPTION_MULTIPLIER : 1;

    // SnapTrade quotes an option's `price` per share but its
    // `average_purchase_price` per CONTRACT. Trades store entry prices per share
    // with the multiplier applied to `cost`, so divide the average back down —
    // otherwise a $6.75 contract books a 100x cost basis.
    const entryPerShare = avgCost === null ? null : avgCost / multiplier;

    rows.push({
      userId,
      groupKey: `hold:${instrumentKey(p)}`,
      source: "snaptrade",
      accountId: p.accountId,
      symbol: p.symbol,
      description: p.description,
      kind: p.kind,
      direction: qty < 0 ? "short" : "long",
      status: "open",
      optionType: p.optionType,
      strike: p.strike,
      expiry: p.expiry,
      openedQty: String(size),
      closedQty: "0",
      avgEntryPrice: entryPerShare === null ? null : String(entryPerShare),
      cost: entryPerShare === null ? "0" : (entryPerShare * size * multiplier).toFixed(2),
      proceeds: "0",
      // Broker-reported holding with no fills behind it: we know the cost basis
      // (when the broker gives one) but never the entry time.
      entryAt: null,
      incomplete: avgCost === null,
      updatedAt: new Date(),
    });
  }

  if (rows.length) {
    await db
      .insert(trades)
      .values(rows)
      .onConflictDoUpdate({
        target: [trades.userId, trades.groupKey],
        set: {
          accountId: sql`excluded.account_id`,
          description: sql`excluded.description`,
          direction: sql`excluded.direction`,
          status: sql`excluded.status`,
          openedQty: sql`excluded.opened_qty`,
          avgEntryPrice: sql`excluded.avg_entry_price`,
          cost: sql`excluded.cost`,
          incomplete: sql`excluded.incomplete`,
          updatedAt: new Date(),
        },
      });
  }

  // Drop stand-ins the current snapshot no longer justifies.
  const keep = rows.map((r) => r.groupKey!);
  const stale = await db
    .delete(trades)
    .where(
      and(
        eq(trades.userId, userId),
        like(trades.groupKey, "hold:%"),
        ...(keep.length ? [notInArray(trades.groupKey, keep)] : []),
      ),
    )
    .returning({ id: trades.id });

  return { synthesized: rows.length, removed: stale.length };
}
