"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { trades } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * Risk / R-multiple for a trade.
 *
 * R-multiple is the backbone of serious journaling: result expressed in units
 * of what you risked, so a +$300 scalp and a +$3,000 swing are comparable if
 * both made 1.5R. We can't infer the stop from fills, so the trader supplies it
 * (the price they'd have bailed at) and we derive the rest:
 *
 *   risk/unit = |avg entry − stop|         (per share, same units as entry)
 *   total risk = risk/unit × qty × mult    (mult = 100 for options)
 *   R          = realized P/L ÷ total risk
 *
 * Stored as riskSource='manual' so it's clearly the trader's figure, not
 * inferred. Options price per share but settle ×100, matching how cost is kept.
 */

const OPTION_MULTIPLIER = 100;

export interface RiskResult {
  riskPerUnit: number;
  totalRisk: number;
  rMultiple: number | null;
}

export async function setTradeRisk(
  tradeId: string,
  stopPrice: number,
): Promise<RiskResult> {
  const user = await requireUser();

  const [t] = await db
    .select({
      avgEntryPrice: trades.avgEntryPrice,
      openedQty: trades.openedQty,
      kind: trades.kind,
      netPnl: trades.netPnl,
    })
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.userId, user.id)))
    .limit(1);
  if (!t) throw new Error("Trade not found.");

  const entry = t.avgEntryPrice == null ? null : Number(t.avgEntryPrice);
  const qty = Number(t.openedQty);
  if (entry == null || !Number.isFinite(stopPrice) || qty <= 0) {
    throw new Error("This trade doesn't have the entry price needed to score risk.");
  }

  const mult = t.kind === "option" ? OPTION_MULTIPLIER : 1;
  const riskPerUnit = Math.abs(entry - stopPrice);
  if (riskPerUnit <= 0) throw new Error("Stop must differ from the entry price.");

  const totalRisk = riskPerUnit * qty * mult;
  const netPnl = t.netPnl == null ? null : Number(t.netPnl);
  const rMultiple = netPnl != null && totalRisk > 0 ? netPnl / totalRisk : null;

  await db
    .update(trades)
    .set({
      riskSource: "manual",
      initialRiskPerUnit: String(riskPerUnit),
      rMultiple: rMultiple == null ? null : String(Math.round(rMultiple * 100) / 100),
      updatedAt: new Date(),
    })
    .where(and(eq(trades.id, tradeId), eq(trades.userId, user.id)));

  revalidatePath(`/journal/${tradeId}`);
  return {
    riskPerUnit,
    totalRisk,
    rMultiple: rMultiple == null ? null : Math.round(rMultiple * 100) / 100,
  };
}

/** Remove the risk figure — back to "not scored". */
export async function clearTradeRisk(tradeId: string) {
  const user = await requireUser();
  await db
    .update(trades)
    .set({ riskSource: null, initialRiskPerUnit: null, rMultiple: null, updatedAt: new Date() })
    .where(and(eq(trades.id, tradeId), eq(trades.userId, user.id)));
  revalidatePath(`/journal/${tradeId}`);
  return { ok: true };
}
