import "server-only";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiAnalyses } from "@/lib/db/schema";
import { getTradeById } from "@/lib/queries/journal";
import { getTradeChart } from "@/lib/market/candles";
import { computeExcursions, type Excursions } from "@/lib/analysis/excursions";
import { computeRunningPnl } from "@/lib/analysis/running-pnl";
import { deepseekJson, extractJson } from "./deepseek";
import { fallbackReview } from "./fallback-review";
import { tradeLabel } from "@/lib/trade-display";

/**
 * The shape the model must return. Deliberately small — a headline, a short
 * plain-English recap, a few numbered observations, one thing to review. Caps
 * live in the schema and the prompt so output can't balloon into a wall of text.
 */
const reviewSchema = z.object({
  headline: z.string().max(120),
  whatHappened: z.string().max(400),
  observations: z
    .array(z.object({ label: z.string().max(40), detail: z.string().max(220) }))
    .max(4),
  toReview: z.string().max(220).nullable(),
});
export type TradeReview = z.infer<typeof reviewSchema>;

export interface ReviewResult {
  review: TradeReview;
  /** "ai" when DeepSeek narrated it, "computed" when it's the deterministic floor. */
  kind: "ai" | "computed";
  cached: boolean;
}

/** The trade's dollar P/L journey, summarized for the model. */
export interface RunSummary {
  /** best unrealized P/L reached */
  peak: number;
  /** worst unrealized P/L (deepest underwater; may be negative) */
  worst: number;
  /** largest peak→trough decline in dollars */
  maxDrawdown: number;
  /** dollars surrendered from the peak by exit */
  giveback: number;
  /** share of the hold spent in the red, 0–100 */
  timeUnderwaterPct: number;
  /** true if the high came before the exit (gains were then given back) */
  peakBeforeExit: boolean;
  /** true when the figures are an estimate (options) rather than exact (stocks) */
  estimated: boolean;
}

/** Only the numbers the model is allowed to talk about. */
interface ReviewInput {
  name: string;
  kind: string;
  optionType: "call" | "put" | null;
  direction: "long" | "short";
  netPnl: number;
  contractEntry: number | null;
  contractExit: number | null;
  holdingLabel: string;
  excursions: Excursions;
  run: RunSummary | null;
}

const fmtHold = (seconds: number | null): string => {
  if (seconds == null) return "unknown";
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  return `${(seconds / 86400).toFixed(1)} days`;
};

function hashInput(input: ReviewInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
}

const SYSTEM = `You are a trading-journal assistant explaining ONE closed trade to the trader who made it.

Your job is to explain, in plain language, what the provided numbers mean — NOT to compute anything, NOT to invent numbers, and NOT to give trading advice.

Hard rules:
- Use ONLY the numbers given. Never state a figure that isn't in the input.
- Never say "buy", "sell", "hold", or predict the future. Frame everything as review of a trade that already happened.
- Write for a beginner. No jargon without a plain gloss. No emoji.
- Be concise. Every sentence must earn its place. Prefer specifics over generalities.
- The price excursions describe the UNDERLYING stock, not the option's value. Say "the stock" / "the share price", never imply it's the option's drawdown.
- The P/L-journey figures ARE the position's own dollar P/L over the hold. When they're marked estimated, say "about" or "roughly". Use them to notice patterns like sitting through a large drawdown before the trade worked, or giving back most of the gains before exiting — this is exactly the kind of thing worth reviewing.
- Nonjudgmental tone. Point out patterns as things to notice, not mistakes to scold. "What could have gone better" is fair as a retrospective observation; never phrase it as advice for the future or a prediction.

Return ONLY JSON in exactly this shape:
{
  "headline": "one sentence — the single most useful takeaway (<= 15 words)",
  "whatHappened": "2-3 short sentences recapping the trade in plain English",
  "observations": [ { "label": "2-4 word tag", "detail": "one sentence tied to a specific number" } ],  // 2 to 4 items
  "toReview": "one specific, non-judgmental thing worth noticing next time, or null"
}`;

function buildUserPrompt(i: ReviewInput): string {
  const e = i.excursions;
  const thesisPlain =
    i.kind === "option"
      ? `a ${i.optionType} — a bet the ${i.name.split(" ")[0]} share price would ${
          e.thesis === "bullish" ? "rise" : "fall"
        }`
      : `a ${i.direction} position — a bet the share price would ${
          e.thesis === "bullish" ? "rise" : "fall"
        }`;

  return `Trade: ${i.name} (${thesisPlain}).
Outcome: realized ${i.netPnl >= 0 ? "profit" : "loss"} of $${Math.abs(i.netPnl).toFixed(2)}.
Held for: ${i.holdingLabel}.
${
  i.contractEntry != null && i.contractExit != null
    ? `The option's price went from $${i.contractEntry} to $${i.contractExit} per share.`
    : ""
}

Underlying stock, during the hold (these describe the STOCK, not the option):
- Stock price when opened: $${e.entryPrice}
- Stock price when closed: $${e.exitPrice}
- Net move in the thesis direction: ${e.netMovePct >= 0 ? "+" : ""}${e.netMovePct}% (positive = moved the way the trade needed)
- Best it moved in your favour at any point: +${e.favorableExcursionPct}%
- Worst it moved against you at any point: -${e.adverseExcursionPct}%
${
  e.capturedPct != null
    ? `- Of that best favourable move, the exit captured about ${e.capturedPct}%`
    : ""
}
${
  e.entryPositionPct != null
    ? `- The entry price sat at the ${e.entryPositionPct}% mark of the stock's range during the hold (0% = the lowest point, 100% = the highest)`
    : ""
}
- The stock ultimately moved ${e.directionCorrect ? "in the trade's favour" : "against the trade"}.
${
  i.run
    ? `
Your position's own P/L during the hold (${i.run.estimated ? "estimated from the stock's path" : "exact"}):
- Best it was ever up: ${i.run.peak >= 0 ? "+" : ""}$${i.run.peak}
- Worst it was ever down: ${i.run.worst >= 0 ? "+" : ""}$${i.run.worst}
- Largest drawdown (peak to later low): $${i.run.maxDrawdown}
- Gave back from the best point by the time you exited: $${i.run.giveback}
- Spent about ${i.run.timeUnderwaterPct}% of the hold underwater (in the red)
- The high point came ${i.run.peakBeforeExit ? "BEFORE you exited — gains were then given back" : "right at your exit"}`
    : ""
}

Explain this trade to the trader using only these numbers. If the P/L journey shows a large drawdown you sat through or a meaningful giveback before exit, make that one of your observations.`;
}

interface ReviewContext {
  input: ReviewInput;
  inputHash: string;
  fallback: TradeReview;
}

/** Everything needed to render or generate a review. Null = genuinely no data. */
async function buildContext(
  userId: string,
  tradeId: string,
): Promise<ReviewContext | null> {
  const trade = await getTradeById(userId, tradeId);
  if (!trade || !trade.entryAt) return null;

  const chart = await getTradeChart(trade.symbol, trade.entryAt, trade.exitAt).catch(
    () => null,
  );
  if (!chart || chart.entryPrice == null || chart.exitPrice == null) return null;

  const excursions = computeExcursions(
    chart.candles,
    trade.entryAt,
    trade.exitAt,
    chart.entryPrice,
    chart.exitPrice,
    trade.kind,
    trade.direction,
    trade.optionType,
  );
  if (!excursions) return null;

  const rp = computeRunningPnl({
    candles: chart.candles,
    entryAt: trade.entryAt,
    exitAt: trade.exitAt,
    kind: trade.kind,
    direction: trade.direction,
    entryUnderlying: chart.entryPrice,
    exitUnderlying: chart.exitPrice,
    avgEntryPrice: trade.avgEntryPrice,
    avgExitPrice: trade.avgExitPrice,
    qty: Math.max(trade.openedQty, trade.closedQty),
    realizedPnl: trade.netPnl,
  });
  const run: RunSummary | null = rp
    ? {
        peak: Math.round(rp.peak.pnl),
        worst: Math.round(rp.trough.pnl),
        maxDrawdown: Math.round(rp.maxDrawdown),
        giveback: Math.round(rp.giveback),
        timeUnderwaterPct: rp.timeUnderwaterPct,
        peakBeforeExit: rp.peakBeforeExit,
        estimated: rp.estimated,
      }
    : null;

  const input: ReviewInput = {
    name: tradeLabel(trade),
    kind: trade.kind,
    optionType: trade.optionType,
    direction: trade.direction,
    netPnl: trade.netPnl,
    contractEntry: trade.avgEntryPrice,
    contractExit: trade.avgExitPrice,
    holdingLabel: fmtHold(trade.holdingSeconds),
    excursions,
    run,
  };

  return {
    input,
    inputHash: hashInput(input),
    // The deterministic floor — always valid, never an error.
    fallback: fallbackReview(
      input.name,
      trade.symbol,
      trade.kind,
      trade.optionType,
      trade.netPnl,
      trade.avgEntryPrice,
      trade.avgExitPrice,
      input.holdingLabel,
      excursions,
      run,
    ),
  };
}

/**
 * Initial state for the page — no spend. Returns whatever we can show right
 * now: a cached AI review if one exists, otherwise the computed floor. The
 * client upgrades the floor to AI in the background.
 */
export async function getInitialReview(
  userId: string,
  tradeId: string,
): Promise<{ needsData: true } | ReviewResult> {
  const ctx = await buildContext(userId, tradeId);
  if (!ctx) return { needsData: true };

  const [cached] = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.tradeId, tradeId),
        eq(aiAnalyses.inputHash, ctx.inputHash),
      ),
    )
    .limit(1);

  if (cached) {
    return { review: cached.output as TradeReview, kind: "ai", cached: true };
  }
  return { review: ctx.fallback, kind: "computed", cached: false };
}

/**
 * Generates and caches the AI narrative. Compute-then-narrate: the numbers are
 * already fixed; the model only writes prose over them.
 *
 * Never throws for the UI's sake — on ANY failure it returns the computed
 * review so the user always sees a solid result. That's the "solid results
 * always" contract.
 */
export async function generateAiReview(
  userId: string,
  tradeId: string,
): Promise<{ needsData: true } | ReviewResult> {
  const ctx = await buildContext(userId, tradeId);
  if (!ctx) return { needsData: true };

  // Serve an existing AI review rather than re-billing.
  const [cached] = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.tradeId, tradeId),
        eq(aiAnalyses.inputHash, ctx.inputHash),
      ),
    )
    .limit(1);
  if (cached) {
    return { review: cached.output as TradeReview, kind: "ai", cached: true };
  }

  try {
    const result = await deepseekJson([
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUserPrompt(ctx.input) },
    ]);

    // Validate — a malformed or number-inventing response must not reach the UI.
    const parsed = reviewSchema.safeParse(extractJson(result.content));
    if (!parsed.success) return { review: ctx.fallback, kind: "computed", cached: false };

    await db
      .insert(aiAnalyses)
      .values({
        userId,
        tradeId,
        type: "trade_review",
        inputHash: ctx.inputHash,
        model: result.model,
        output: parsed.data,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      })
      .onConflictDoNothing({
        target: [aiAnalyses.userId, aiAnalyses.tradeId, aiAnalyses.inputHash],
      });

    return { review: parsed.data, kind: "ai", cached: false };
  } catch {
    // Balance exhausted, timeout, bad shape — the floor is still solid.
    return { review: ctx.fallback, kind: "computed", cached: false };
  }
}
