"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  aiAnalyses,
  brokerageAccounts,
  brokerageConnections,
  coachSummaries,
  fills,
  importBatches,
  importRowErrors,
  positions,
  profiles,
  reconstructionRuns,
  snaptradeUsers,
  tags,
  tradeLegs,
  tradeNotes,
  tradeTags,
  trades,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTrades } from "@/lib/queries/journal";
import { captureError, logEvent } from "@/lib/observability";

/** Update the display name (stored on the Supabase auth user's metadata). */
export async function updateDisplayName(name: string) {
  const user = await requireUser();
  const clean = name.trim().slice(0, 80);
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: clean } });
  if (error) throw new Error("Couldn't update your name.");
  revalidatePath("/settings");
  return { ok: true };
}

/** Update the account timezone (drives session/day-of-week analytics). */
export async function updateTimezone(timezone: string) {
  const user = await requireUser();
  await db
    .insert(profiles)
    .values({ id: user.id, timezone })
    .onConflictDoUpdate({ target: profiles.id, set: { timezone, updatedAt: new Date() } });
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Portability export — everything the user has, as a JSON string they can save.
 * Returned to the client, which triggers the download; nothing leaves the
 * server except to the authenticated user themselves.
 */
export async function exportData(): Promise<{ filename: string; json: string }> {
  const user = await requireUser();
  const tradeRows = await getTrades(user.id, { limit: 100000 });
  logEvent("data_export", { userId: user.id, trades: tradeRows.length });
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    trades: tradeRows,
  };
  return {
    filename: `tradercat-export-${new Date().toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

/**
 * Erasure — delete every row of the user's data across all tables. Scoped to
 * the caller and ordered children-before-parents so foreign keys never block.
 * The auth login itself remains (removing it needs the service-role admin API);
 * this wipes all financial data, which is what a data-deletion request means.
 * Guarded by a typed confirmation in the UI.
 */
export async function deleteAllData(confirmation: string) {
  const user = await requireUser();
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    throw new Error("Type DELETE to confirm.");
  }

  const uid = user.id;
  try {
    await db.transaction(async (tx) => {
      // children → parents
      await tx.delete(aiAnalyses).where(eq(aiAnalyses.userId, uid));
      await tx.delete(coachSummaries).where(eq(coachSummaries.userId, uid));
      await tx.delete(tradeTags).where(eq(tradeTags.userId, uid));
      await tx.delete(tradeLegs).where(eq(tradeLegs.userId, uid));
      await tx.delete(tradeNotes).where(eq(tradeNotes.userId, uid));
      await tx.delete(tags).where(eq(tags.userId, uid));
      await tx.delete(trades).where(eq(trades.userId, uid));
      await tx.delete(reconstructionRuns).where(eq(reconstructionRuns.userId, uid));
      await tx.delete(importRowErrors).where(eq(importRowErrors.userId, uid));
      await tx.delete(importBatches).where(eq(importBatches.userId, uid));
      await tx.delete(fills).where(eq(fills.userId, uid));
      await tx.delete(positions).where(eq(positions.userId, uid));
      await tx.delete(brokerageAccounts).where(eq(brokerageAccounts.userId, uid));
      await tx.delete(brokerageConnections).where(eq(brokerageConnections.userId, uid));
      await tx.delete(snaptradeUsers).where(eq(snaptradeUsers.userId, uid));
      await tx
        .delete(profiles)
        .where(and(eq(profiles.id, uid))); // profiles is keyed on the user id
    });
    logEvent("data_deleted", { userId: uid });
  } catch (err) {
    captureError(err, { op: "delete_all_data", userId: uid });
    throw new Error("Couldn't delete your data. Nothing was removed — try again.");
  }

  // Sign out — their data is gone; the session shouldn't linger.
  const supabase = createClient();
  await supabase.auth.signOut();
  return { ok: true };
}
