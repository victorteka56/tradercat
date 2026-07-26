"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags, tradeTags, trades } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import type { TagKind, TradeTag } from "@/lib/queries/journal";

/**
 * Tag writes for a trade. Tags are the trader's own labels — setups that worked,
 * mistakes that recurred, the emotion behind the entry — and they're what let
 * analytics answer "which setup makes money" rather than only inferring from
 * timing. Every action re-checks trade ownership; a tag can never cross tenants.
 */

const KINDS: TagKind[] = ["setup", "mistake", "emotion", "custom"];

async function assertOwnsTrade(userId: string, tradeId: string) {
  const [owned] = await db
    .select({ id: trades.id })
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)))
    .limit(1);
  if (!owned) throw new Error("Trade not found.");
}

/**
 * Attach a tag to a trade, creating the tag on first use. Names are matched
 * case-insensitively within a user so "Breakout" and "breakout" don't split a
 * setup into two buckets.
 */
export async function addTradeTag(
  tradeId: string,
  rawName: string,
  kind: TagKind = "custom",
): Promise<TradeTag> {
  const user = await requireUser();
  await assertOwnsTrade(user.id, tradeId);

  const name = rawName.trim().slice(0, 40);
  if (!name) throw new Error("Tag name is required.");
  const safeKind = KINDS.includes(kind) ? kind : "custom";

  // Reuse an existing tag with the same name (case-insensitive), else create it.
  const existing = await db
    .select({ id: tags.id, name: tags.name, kind: tags.kind })
    .from(tags)
    .where(and(eq(tags.userId, user.id), sql`lower(${tags.name}) = ${name.toLowerCase()}`))
    .limit(1);

  let tag = existing[0];
  if (!tag) {
    const [created] = await db
      .insert(tags)
      .values({ userId: user.id, name, kind: safeKind })
      .returning({ id: tags.id, name: tags.name, kind: tags.kind });
    tag = created;
  }

  // Idempotent link — the unique (trade_id, tag_id) index makes re-adding a no-op.
  await db
    .insert(tradeTags)
    .values({ userId: user.id, tradeId, tagId: tag.id })
    .onConflictDoNothing();

  return { id: tag.id, name: tag.name, kind: tag.kind as TagKind };
}

/** Detach a tag from a trade. The tag itself survives for its other trades. */
export async function removeTradeTag(tradeId: string, tagId: string) {
  const user = await requireUser();
  await assertOwnsTrade(user.id, tradeId);

  await db
    .delete(tradeTags)
    .where(
      and(
        eq(tradeTags.userId, user.id),
        eq(tradeTags.tradeId, tradeId),
        eq(tradeTags.tagId, tagId),
      ),
    );

  return { ok: true };
}
