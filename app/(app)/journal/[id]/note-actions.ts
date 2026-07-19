"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tradeNotes, trades } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * Save (or clear) the free-text note on a trade. One note row per trade — we
 * update in place so the note has a single, stable home. The trade's ownership
 * is re-checked here; a trade id from another user must never resolve.
 */
export async function saveTradeNote(tradeId: string, body: string) {
  const user = await requireUser();

  const [owned] = await db
    .select({ id: trades.id })
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.userId, user.id)))
    .limit(1);
  if (!owned) throw new Error("Trade not found.");

  const trimmed = body.trim();

  const [existing] = await db
    .select({ id: tradeNotes.id })
    .from(tradeNotes)
    .where(and(eq(tradeNotes.userId, user.id), eq(tradeNotes.tradeId, tradeId)))
    .limit(1);

  if (existing) {
    await db.update(tradeNotes).set({ body: trimmed }).where(eq(tradeNotes.id, existing.id));
  } else if (trimmed) {
    await db.insert(tradeNotes).values({ userId: user.id, tradeId, body: trimmed });
  }

  return { ok: true };
}
