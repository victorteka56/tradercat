import "server-only";

import { and, eq, isNotNull, notExists } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiAnalyses, trades } from "@/lib/db/schema";
import { generateAiReview } from "./trade-review";

/**
 * Generates AI reviews ahead of time so a trade is already analysed before the
 * user ever opens it. This is what makes the per-click wait disappear.
 *
 * Only synced trades qualify — CSV trades have no execution times, so no
 * excursions, so no honest review. Already-cached trades are skipped, so this
 * is cheap to re-run and only fills gaps.
 *
 * Runs with bounded concurrency. Errors on individual trades are swallowed:
 * one bad trade must never stall the batch.
 *
 * NOTE: today this is fire-and-forget from a server action, which works in a
 * long-lived dev server. In production it belongs in a real background queue
 * (Inngest) — a detached promise can be killed when the serverless function
 * returns. See AGENTS.md.
 */
export async function precomputeReviews(
  userId: string,
  opts: { concurrency?: number; max?: number } = {},
): Promise<{ generated: number; considered: number }> {
  const concurrency = opts.concurrency ?? 4;
  const max = opts.max ?? 500;

  // Closed, synced trades with entry times that have no cached review yet.
  const pending = await db
    .select({ id: trades.id })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.source, "snaptrade"),
        eq(trades.status, "closed"),
        isNotNull(trades.entryAt),
        notExists(
          db
            .select({ x: aiAnalyses.id })
            .from(aiAnalyses)
            .where(
              and(
                eq(aiAnalyses.tradeId, trades.id),
                eq(aiAnalyses.userId, userId),
              ),
            ),
        ),
      ),
    )
    .limit(max);

  let generated = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const tradeId = pending[cursor++].id;
      try {
        const res = await generateAiReview(userId, tradeId);
        if (!("needsData" in res) && res.kind === "ai") generated++;
      } catch {
        /* skip — a single failure never stalls the batch */
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, worker),
  );

  return { generated, considered: pending.length };
}
