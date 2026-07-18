"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAnalyses, brokerageConnections, trades } from "@/lib/db/schema";
import { getConnections } from "@/lib/queries/brokerage";
import { disconnectBrokerage } from "@/lib/snaptrade/sync";
import { clearImportedData } from "@/lib/import/pipeline";
import { precomputeReviews } from "@/lib/ai/precompute";

/**
 * Dev-only test controls. Reset state fast so the connect → sync → precompute
 * loop can be exercised repeatedly. Not shown in production.
 */

export interface DevCounts {
  connections: number;
  syncedTrades: number;
  csvTrades: number;
  reviewableTrades: number; // synced + closed + has entry time
  cachedReviews: number;
}

export async function getDevCounts(userId: string): Promise<DevCounts> {
  const [row] = await db
    .select({
      syncedTrades: sql<string>`count(*) filter (where ${trades.source} = 'snaptrade')`,
      csvTrades: sql<string>`count(*) filter (where ${trades.source} = 'robinhood_csv')`,
      reviewable: sql<string>`count(*) filter (where ${trades.source} = 'snaptrade' and ${trades.status} = 'closed' and ${trades.entryAt} is not null)`,
    })
    .from(trades)
    .where(eq(trades.userId, userId));

  const [conns] = await db
    .select({ n: sql<string>`count(*)` })
    .from(brokerageConnections)
    .where(eq(brokerageConnections.userId, userId));

  const [reviews] = await db
    .select({ n: sql<string>`count(*)` })
    .from(aiAnalyses)
    .where(eq(aiAnalyses.userId, userId));

  return {
    connections: Number(conns?.n ?? 0),
    syncedTrades: Number(row?.syncedTrades ?? 0),
    csvTrades: Number(row?.csvTrades ?? 0),
    reviewableTrades: Number(row?.reviewable ?? 0),
    cachedReviews: Number(reviews?.n ?? 0),
  };
}

/** Manual precompute — awaits so the caller sees how many were generated. */
export async function runPrecompute(): Promise<{ generated: number; considered: number }> {
  const user = await requireUser();
  const res = await precomputeReviews(user.id);
  revalidatePath("/import");
  return res;
}

/** Disconnect every brokerage (SnapTrade-side too) — cascades all synced data. */
export async function disconnectAll(): Promise<{ removed: number }> {
  const user = await requireUser();
  const conns = await getConnections(user.id);
  for (const c of conns) {
    await disconnectBrokerage(user.id, c.id).catch(() => {});
  }
  revalidatePath("/import");
  revalidatePath("/portfolio");
  return { removed: conns.length };
}

/** Wipe CSV imports (fills + trades + reviews). */
export async function clearUploads(): Promise<void> {
  const user = await requireUser();
  await clearImportedData(user.id);
  revalidatePath("/import");
  revalidatePath("/journal");
}

/** Drop every cached AI review so precompute regenerates from scratch. */
export async function clearReviews(): Promise<{ removed: number }> {
  const user = await requireUser();
  const rows = await db
    .delete(aiAnalyses)
    .where(eq(aiAnalyses.userId, user.id))
    .returning({ id: aiAnalyses.id });
  revalidatePath("/import");
  return { removed: rows.length };
}
