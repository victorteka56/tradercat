import "server-only";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiAnalyses } from "@/lib/db/schema";
import { getTradeById, getTradeFills, type TradeFill } from "@/lib/queries/journal";
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

/** One priced leg of the position — a single buy or sell. */
export interface FillLeg {
  qty: number;
  price: number | null;
}

/** How the position was built and unwound — the execution story. */
export interface FillsSummary {
  entries: FillLeg[];
  exits: FillLeg[];
  /** more than one opening fill */
  scaledIn: boolean;
  /** more than one closing fill */
  scaledOut: boolean;
  /** added to the position at a worse price than the first entry (long: lower; short: higher) */
  averagedDown: boolean;
  /** how much worse the worst add was vs the first entry, in %, when averaged down */
  addWorsePct: number | null;
}

/**
 * Reduces the raw fills to the execution story: how many entries/exits, whether
 * the trader scaled in or out, and — the one that usually matters — whether they
 * added to a position that was already moving against them (averaging down).
 */
function summarizeFills(
  fills: TradeFill[],
  direction: "long" | "short",
): FillsSummary | null {
  if (fills.length === 0) return null;

  const ordered = [...fills].sort(
    (a, b) => a.executedAt.getTime() - b.executedAt.getTime(),
  );

  const classify = (code: string): "entry" | "exit" | "other" => {
    const c = code.toUpperCase();
    if (c === "BTO" || c === "STO") return "entry";
    if (c === "STC" || c === "BTC" || c === "OEXP" || c === "OASGN") return "exit";
    if (c === "BUY") return direction === "long" ? "entry" : "exit";
    if (c === "SELL") return direction === "long" ? "exit" : "entry";
    return "other";
  };

  const entries: FillLeg[] = [];
  const exits: FillLeg[] = [];
  for (const f of ordered) {
    const leg: FillLeg = { qty: Math.abs(f.quantity), price: f.price };
    const cls = classify(f.code);
    if (cls === "entry") entries.push(leg);
    else if (cls === "exit") exits.push(leg);
  }
  if (entries.length === 0 && exits.length === 0) return null;

  // Averaging down: a later entry filled at a materially worse price than the
  // first — for a long that's cheaper, for a short that's more expensive.
  const priced = entries.filter((e): e is { qty: number; price: number } => e.price != null);
  let averagedDown = false;
  let addWorsePct: number | null = null;
  if (priced.length >= 2) {
    const first = priced[0].price;
    const adds = priced.slice(1).map((e) => e.price);
    const worst = direction === "long" ? Math.min(...adds) : Math.max(...adds);
    const worseFrac =
      direction === "long" ? (first - worst) / first : (worst - first) / first;
    if (worseFrac > 0.03 && first > 0) {
      averagedDown = true;
      addWorsePct = Math.round(worseFrac * 1000) / 10;
    }
  }

  return {
    entries,
    exits,
    scaledIn: entries.length >= 2,
    scaledOut: exits.length >= 2,
    averagedDown,
    addWorsePct,
  };
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
  fills: FillsSummary | null;
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
- You may be given the fills — how the position was built and unwound. If they show a notable execution pattern that shaped the outcome (especially AVERAGING DOWN: adding to the position at a worse price while it was moving against you; or scaling in / scaling out), make that one of your observations, tied to the fill prices and the result. This is often the single most useful thing to point out.
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
${i.fills ? fillsPrompt(i.fills) : ""}

Explain this trade to the trader using only these numbers. If the P/L journey shows a large drawdown you sat through or a meaningful giveback before exit, make that one of your observations. If the fills show averaging down or notable scaling that shaped the result, make that an observation too.`;
}

/** The fills section of the prompt — prices are capped so it can't balloon. */
function fillsPrompt(f: FillsSummary): string {
  const prices = (legs: FillLeg[]): string => {
    const p = legs.filter((l) => l.price != null).map((l) => `$${l.price}`);
    if (p.length === 0) return "";
    if (p.length <= 8) return ` at ${p.join(", ")}`;
    return ` at ${p.slice(0, 8).join(", ")}, … (${p.length} priced fills)`;
  };

  const lines = [
    "",
    "How you built and unwound the position (fills):",
    `- Opened/added in ${f.entries.length} fill(s)${prices(f.entries)}.`,
    `- Closed in ${f.exits.length} fill(s)${prices(f.exits)}.`,
  ];
  if (f.averagedDown) {
    lines.push(
      `- You ADDED to the position at a worse price than your first entry${
        f.addWorsePct != null ? ` (about ${f.addWorsePct}% worse)` : ""
      } — i.e. you averaged down while the trade was moving against you.`,
    );
  } else if (f.scaledIn) {
    lines.push("- You scaled in across several entries.");
  }
  if (f.scaledOut) lines.push("- You scaled out across several exits.");
  return lines.join("\n");
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

  const [chart, fillRows] = await Promise.all([
    getTradeChart(trade.symbol, trade.entryAt, trade.exitAt).catch(() => null),
    getTradeFills(userId, tradeId).catch(() => [] as TradeFill[]),
  ]);
  if (!chart || chart.entryPrice == null || chart.exitPrice == null) return null;

  const fills = summarizeFills(fillRows, trade.direction);

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
    fills,
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
      fills,
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
