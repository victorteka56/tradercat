import "server-only";

import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fills,
  importBatches,
  importRowErrors,
  reconstructionRuns,
  tradeLegs,
  trades,
} from "@/lib/db/schema";
import { parseRobinhoodActivity } from "./robinhood";
import { reconstructTrades, type ReconFill } from "./reconstruct";

/** numeric columns are strings in Drizzle — floats would drift when summed. */
const n = (v: number | null | undefined): string | null =>
  v === null || v === undefined ? null : String(v);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface ImportOutcome {
  batchId: string;
  totalRows: number;
  fillsParsed: number;
  fillsInserted: number;
  duplicatesSkipped: number;
  rowErrors: number;
  tradesUpserted: number;
  dateFrom: Date | null;
  dateTo: Date | null;
}

/**
 * Parses a Robinhood activity CSV, persists the fills, and rebuilds trades.
 *
 * Idempotent end to end: fills dedupe on (user_id, idempotency_key) and trades
 * upsert on (user_id, group_key), so re-importing the same or an overlapping
 * export is safe.
 *
 * Runs inline for now. Per AGENTS.md this belongs in a background job once
 * files get large — a 8k-row import is a few seconds, which a serverless
 * request budget won't tolerate forever.
 */
export async function importRobinhoodCsv(
  userId: string,
  fileName: string,
  text: string,
): Promise<ImportOutcome> {
  const parsed = parseRobinhoodActivity(text);

  const [batch] = await db
    .insert(importBatches)
    .values({
      userId,
      fileName,
      source: "robinhood",
      sourceType: "robinhood_csv",
      status: "processing",
      rowCount: parsed.totalRows,
      errorCount: parsed.errors.length,
    })
    .returning({ id: importBatches.id });

  try {
    // Never silently drop a row.
    if (parsed.errors.length) {
      for (const batchRows of chunk(parsed.errors, 500)) {
        await db.insert(importRowErrors).values(
          batchRows.map((e) => ({
            importBatchId: batch.id,
            userId,
            rowNumber: e.rowNumber,
            rawRow: e.raw,
            errorCode: e.errorCode,
            message: e.message,
          })),
        );
      }
    }

    let inserted = 0;
    for (const part of chunk(parsed.fills, 500)) {
      const rows = await db
        .insert(fills)
        .values(
          part.map((f) => ({
            userId,
            importBatchId: batch.id,
            symbol: f.symbol,
            description: f.description,
            code: f.code,
            quantity: n(f.quantity)!,
            price: n(f.price),
            amount: n(f.amount)!,
            executedAt: f.executedAt,
            idempotencyKey: f.idempotencyKey,
            raw: f.raw,
          })),
        )
        .onConflictDoNothing({
          target: [fills.userId, fills.idempotencyKey],
        })
        .returning({ id: fills.id });
      inserted += rows.length;
    }

    await db
      .update(importBatches)
      .set({ status: "completed" })
      .where(eq(importBatches.id, batch.id));

    const recon = await runReconstruction(userId, "import", batch.id);

    return {
      batchId: batch.id,
      totalRows: parsed.totalRows,
      fillsParsed: parsed.fills.length,
      fillsInserted: inserted,
      duplicatesSkipped: parsed.fills.length - inserted,
      rowErrors: parsed.errors.length,
      tradesUpserted: recon.tradesUpserted,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    };
  } catch (err) {
    await db
      .update(importBatches)
      .set({ status: "failed" })
      .where(eq(importBatches.id, batch.id));
    throw err;
  }
}

/** Rebuilds every trade for a user from their fills. Safe to re-run. */
export async function runReconstruction(
  userId: string,
  trigger: "import" | "sync" | "manual",
  importBatchId?: string,
) {
  const [run] = await db
    .insert(reconstructionRuns)
    .values({
      userId,
      importBatchId: importBatchId ?? null,
      trigger,
      status: "running",
    })
    .returning({ id: reconstructionRuns.id });

  try {
    const rows = await db
      .select({
        id: fills.id,
        symbol: fills.symbol,
        description: fills.description,
        code: fills.code,
        quantity: fills.quantity,
        price: fills.price,
        amount: fills.amount,
        executedAt: fills.executedAt,
      })
      .from(fills)
      .where(eq(fills.userId, userId));

    const input: ReconFill[] = rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      description: r.description ?? "",
      code: r.code,
      quantity: Number(r.quantity),
      price: r.price === null ? null : Number(r.price),
      amount: Number(r.amount),
      executedAt: r.executedAt,
    }));

    const drafts = reconstructTrades(input);
    let upserted = 0;

    for (const part of chunk(drafts, 200)) {
      const saved = await db
        .insert(trades)
        .values(
          part.map((d) => ({
            userId,
            reconstructionRunId: run.id,
            groupKey: d.groupKey,
            symbol: d.symbol,
            description: d.description,
            kind: d.kind,
            direction: d.direction,
            status: d.status,
            optionType: d.optionType,
            strike: n(d.strike),
            expiry: d.expiry,
            openedQty: n(d.openedQty)!,
            closedQty: n(d.closedQty)!,
            avgEntryPrice: n(d.avgEntryPrice),
            avgExitPrice: n(d.avgExitPrice),
            cost: n(d.cost)!,
            proceeds: n(d.proceeds)!,
            netPnl: n(d.netPnl),
            entryAt: d.entryAt,
            exitAt: d.exitAt,
            holdingSeconds: d.holdingSeconds,
            updatedAt: new Date(),
          })),
        )
        // Upsert keeps trade ids stable so tags/notes survive a re-import.
        .onConflictDoUpdate({
          target: [trades.userId, trades.groupKey],
          set: {
            reconstructionRunId: sql`excluded.reconstruction_run_id`,
            description: sql`excluded.description`,
            kind: sql`excluded.kind`,
            direction: sql`excluded.direction`,
            status: sql`excluded.status`,
            optionType: sql`excluded.option_type`,
            strike: sql`excluded.strike`,
            expiry: sql`excluded.expiry`,
            openedQty: sql`excluded.opened_qty`,
            closedQty: sql`excluded.closed_qty`,
            avgEntryPrice: sql`excluded.avg_entry_price`,
            avgExitPrice: sql`excluded.avg_exit_price`,
            cost: sql`excluded.cost`,
            proceeds: sql`excluded.proceeds`,
            netPnl: sql`excluded.net_pnl`,
            entryAt: sql`excluded.entry_at`,
            exitAt: sql`excluded.exit_at`,
            holdingSeconds: sql`excluded.holding_seconds`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: trades.id, groupKey: trades.groupKey });

      const idByKey = new Map(saved.map((s) => [s.groupKey, s.id]));
      upserted += saved.length;

      const legRows = part.flatMap((d) => {
        const tradeId = idByKey.get(d.groupKey);
        if (!tradeId) return [];
        return d.legs.map((l) => ({
          tradeId,
          fillId: l.fillId,
          userId,
          legType: l.legType,
          quantity: n(l.quantity)!,
          price: n(l.price),
          executedAt: l.executedAt,
        }));
      });

      for (const legPart of chunk(legRows, 500)) {
        await db
          .insert(tradeLegs)
          .values(legPart)
          .onConflictDoNothing({
            target: [tradeLegs.tradeId, tradeLegs.fillId],
          });
      }
    }

    // Drop trades whose group no longer exists. Without this, a change to the
    // grouping rules leaves orphaned trades behind forever (and they'd still
    // show in the journal). Legs cascade.
    const liveKeys = drafts.map((d) => d.groupKey);
    const pruned = liveKeys.length
      ? await db
          .delete(trades)
          .where(
            and(
              eq(trades.userId, userId),
              notInArray(trades.groupKey, liveKeys),
            ),
          )
          .returning({ id: trades.id })
      : [];

    await db
      .update(reconstructionRuns)
      .set({
        status: "completed",
        fillsConsidered: input.length,
        tradesCreated: upserted,
        finishedAt: new Date(),
      })
      .where(eq(reconstructionRuns.id, run.id));

    return {
      tradesUpserted: upserted,
      fillsConsidered: input.length,
      tradesPruned: pruned.length,
    };
  } catch (err) {
    await db
      .update(reconstructionRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      })
      .where(eq(reconstructionRuns.id, run.id));
    throw err;
  }
}

/** Removes every imported fill and trade for a user. */
export async function clearImportedData(userId: string) {
  await db.delete(trades).where(eq(trades.userId, userId));
  await db.delete(fills).where(eq(fills.userId, userId));
  await db.delete(importBatches).where(eq(importBatches.userId, userId));
}
