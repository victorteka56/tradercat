import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachSummaries } from "@/lib/db/schema";
import {
  getJournalStats,
  getTagPerformance,
  getTrades,
  type TagPerformance,
} from "@/lib/queries/journal";
import { computeAnalytics, type AnalyticsTrade } from "@/lib/analysis/analytics";
import { hasTimeOfDay } from "@/lib/format";
import { captureError } from "@/lib/observability";
import { deepseekJson, extractJson } from "./deepseek";

/**
 * The cross-history coach.
 *
 * The per-trade review sees one trade; this sees the whole book. It reads the
 * deterministic behaviour metrics the analytics engine already computes — hold
 * asymmetry, tilt after a loss, profit concentration, R expectancy, which
 * setups pay — and narrates the two or three that matter most into plain
 * coaching. Same discipline as the trade review: every number is computed
 * here, the model only writes prose, and a deterministic floor always exists so
 * the page never depends on the AI.
 */

const MODEL = "deepseek-v4-flash";
const MIN_TRADES = 8; // below this there isn't a pattern worth coaching.

export interface CoachObservation {
  label: string;
  detail: string;
}
export interface CoachSummary {
  headline: string;
  summary: string;
  observations: CoachObservation[];
  focus: string | null;
  source: "ai" | "computed";
}

const SCHEMA = z.object({
  headline: z.string().max(120),
  summary: z.string().max(600),
  observations: z
    .array(z.object({ label: z.string().max(40), detail: z.string().max(240) }))
    .min(2)
    .max(4),
  focus: z.string().max(240).nullable(),
});

/** The compact numeric picture the coach reasons over. */
interface CoachContext {
  metrics: Record<string, number | string | null>;
  bestSetup: TagPerformance | null;
  worstMistake: TagPerformance | null;
  inputHash: string;
}

function round(n: number | null | undefined, d = 2): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

async function buildContext(userId: string): Promise<CoachContext | null> {
  const [stats, all, tagPerf] = await Promise.all([
    getJournalStats(userId),
    getTrades(userId, { limit: 5000 }),
    getTagPerformance(userId),
  ]);

  if (stats.closedTrades < MIN_TRADES) return null;

  const trades: AnalyticsTrade[] = all
    .filter((t) => t.status === "closed" && !t.incomplete)
    .map((t) => ({
      pnl: t.netPnl,
      kind: t.kind,
      direction: t.direction,
      optionType: t.optionType,
      symbol: t.symbol,
      exitMs: t.exitAt ? new Date(t.exitAt).getTime() : null,
      entryMs: t.entryAt ? new Date(t.entryAt).getTime() : null,
      entryHasTime: hasTimeOfDay(t.entryAt),
      holdingSeconds: t.holdingSeconds,
      rMultiple: t.rMultiple,
    }));

  const a = computeAnalytics(trades);
  if (!a) return null;
  const b = a.behaviorMetrics;

  const bestSetup =
    tagPerf.filter((t) => t.kind === "setup").sort((x, y) => y.expectancy - x.expectancy)[0] ??
    null;
  const worstMistake =
    tagPerf.filter((t) => t.kind === "mistake").sort((x, y) => x.netPnl - y.netPnl)[0] ?? null;

  const metrics: CoachContext["metrics"] = {
    closedTrades: stats.closedTrades,
    netPnl: round(stats.netPnl, 0),
    winRate: stats.winRate,
    profitFactor: round(stats.profitFactor),
    payoffRatio: round(b.payoffRatio),
    avgWin: round(stats.avgWinner, 0),
    avgLoss: round(stats.avgLoser, 0),
    avgHoldWinDays: round(b.avgHoldWinDays, 1),
    avgHoldLossDays: round(b.avgHoldLossDays, 1),
    winRateAfterWin: b.afterWin?.winRate ?? null,
    winRateAfterLoss: b.afterLoss?.winRate ?? null,
    top5ProfitSharePct: round(b.topProfitShare, 0),
    worst5LossSharePct: round(b.worstLossShare, 0),
    maxDrawdown: round(a.summary.maxDrawdown, 0),
    avgR: a.rStats ? round(a.rStats.avgR) : null,
    avgWinR: a.rStats ? round(a.rStats.avgWinR) : null,
    avgLossR: a.rStats ? round(a.rStats.avgLossR) : null,
    scoredTrades: a.rStats?.scored ?? 0,
    bestSetup: bestSetup ? `${bestSetup.name} (${round(bestSetup.expectancy, 0)}/trade over ${bestSetup.trades})` : null,
    worstMistake: worstMistake ? `${worstMistake.name} (${round(worstMistake.netPnl, 0)} over ${worstMistake.trades})` : null,
  };

  const inputHash = createHash("sha256")
    .update(JSON.stringify(metrics))
    .digest("hex")
    .slice(0, 32);

  return { metrics, bestSetup, worstMistake, inputHash };
}

/* ------------------------------- narration -------------------------------- */

const SYSTEM = `You are a trading-journal coach reviewing a trader's WHOLE history — not one trade.

You are given already-computed metrics about how they trade. Your job is to surface, in plain language, the 2-4 patterns that matter most and one thing worth focusing on.

Hard rules:
- Use ONLY the numbers given. Never invent a figure. Quote the specific numbers that support each point.
- No market calls, no predictions, no "buy/sell/hold". This is a review of past behaviour.
- Write for a regular person. No jargon without a plain gloss. No emoji. Be concise and specific.
- Be honest but never scolding — patterns to notice, not failures. It's fine to name a costly habit (e.g. riding losers longer than winners, tilting after a loss, one setup carrying all the profit) as long as it's tied to the numbers.
- Prioritise the sharpest, most actionable patterns: hold-time asymmetry, behaviour after a loss (tilt), profit/loss concentration, R expectancy, and which setups/mistakes the trader's own tags reveal.
- "focus" is one concrete thing worth watching next — a pattern to keep an eye on, framed as observation ("your losers run ~2x longer than winners"), never as advice or a prediction.

Return ONLY JSON:
{
  "headline": "one sentence — the single most important read on how they trade (<= 15 words)",
  "summary": "2-3 sentences of plain-English overview grounded in the numbers",
  "observations": [ { "label": "2-4 word tag", "detail": "one sentence tied to specific numbers" } ],
  "focus": "one specific pattern worth watching next, tied to a number, or null"
}`;

function userPrompt(ctx: CoachContext): string {
  const m = ctx.metrics;
  return `Here are the trader's metrics across ${m.closedTrades} closed trades.

Overall:
- Net P/L: $${m.netPnl}
- Win rate: ${m.winRate}%  (profit factor ${m.profitFactor ?? "n/a"}, payoff ratio ${m.payoffRatio ?? "n/a"})
- Average winner $${m.avgWin}, average loser $${m.avgLoss}
- Max drawdown: $${m.maxDrawdown}

Behaviour:
- Average hold — winners ${m.avgHoldWinDays ?? "n/a"} days, losers ${m.avgHoldLossDays ?? "n/a"} days
- Win rate after a WIN: ${m.winRateAfterWin ?? "n/a"}%; after a LOSS: ${m.winRateAfterLoss ?? "n/a"}%
- Top 5 winners = ${m.top5ProfitSharePct ?? "n/a"}% of all gains; worst 5 losers = ${m.worst5LossSharePct ?? "n/a"}% of all losses

Risk (R-multiple), over ${m.scoredTrades} scored trades:
- Average R ${m.avgR ?? "not scored yet"}; avg winner ${m.avgWinR ?? "n/a"}R, avg loser ${m.avgLossR ?? "n/a"}R

From the trader's own tags:
- Best setup: ${m.bestSetup ?? "none tagged"}
- Costliest mistake: ${m.worstMistake ?? "none tagged"}

Surface the 2-4 patterns that matter most and one thing to focus on. Use only these numbers.`;
}

/* -------------------------- deterministic floor --------------------------- */

function fallback(ctx: CoachContext): CoachSummary {
  const m = ctx.metrics;
  const obs: CoachObservation[] = [];

  const hw = m.avgHoldWinDays as number | null;
  const hl = m.avgHoldLossDays as number | null;
  if (hw != null && hl != null && hl > hw * 1.4) {
    obs.push({
      label: "Losers run longer",
      detail: `Your losers are held about ${hl} days vs ${hw} for winners — the losers get more rope.`,
    });
  }
  const aw = m.winRateAfterWin as number | null;
  const al = m.winRateAfterLoss as number | null;
  if (aw != null && al != null && aw - al >= 7) {
    obs.push({
      label: "Tilt after a loss",
      detail: `You win ${aw}% after a win but only ${al}% after a loss — losses seem to shake the next trade.`,
    });
  }
  if ((m.worst5LossSharePct as number | null) != null && (m.worst5LossSharePct as number) >= 50) {
    obs.push({
      label: "Loss concentration",
      detail: `Your worst 5 trades are ${m.worst5LossSharePct}% of all your losses — a few blow-ups dominate.`,
    });
  }
  if (m.bestSetup) {
    obs.push({ label: "Best setup", detail: `Your strongest tagged setup is ${m.bestSetup}.` });
  }
  if (obs.length < 2) {
    obs.push({
      label: "The bottom line",
      detail: `Across ${m.closedTrades} trades you win ${m.winRate}% with a ${m.payoffRatio ?? "?"}x payoff ratio.`,
    });
  }

  const net = m.netPnl as number;
  return {
    headline:
      net >= 0
        ? `Net positive across ${m.closedTrades} trades, but the habits below shape the result.`
        : `The numbers point to a few costly habits across ${m.closedTrades} trades.`,
    summary: `You've closed ${m.closedTrades} trades at a ${m.winRate}% win rate and a ${
      m.payoffRatio ?? "?"
    }x payoff ratio, for ${net >= 0 ? "a net gain" : "a net loss"} of $${Math.abs(net as number)}.`,
    observations: obs.slice(0, 4),
    focus: ctx.worstMistake
      ? `Watch your "${ctx.worstMistake.name}" trades — they're your costliest tagged mistake.`
      : null,
    source: "computed",
  };
}

/* ------------------------------- public API ------------------------------- */

/** Cached read for the server render — never spends. Null = not enough history. */
export async function getCoachSummary(
  userId: string,
): Promise<{ summary: CoachSummary; stale: boolean } | null> {
  const ctx = await buildContext(userId);
  if (!ctx) return null;

  const [cached] = await db
    .select()
    .from(coachSummaries)
    .where(eq(coachSummaries.userId, userId))
    .limit(1);

  if (cached && cached.inputHash === ctx.inputHash) {
    return {
      summary: { ...(cached.output as Omit<CoachSummary, "source">), source: "ai" },
      stale: false,
    };
  }
  // No fresh AI yet — serve the computed floor, flagged stale so the client warms it.
  return { summary: fallback(ctx), stale: true };
}

/** Generate (or refresh) the AI summary and cache it. Called once from the client. */
export async function refreshCoachSummary(userId: string): Promise<CoachSummary> {
  const ctx = await buildContext(userId);
  if (!ctx) throw new Error("Not enough trade history to coach yet.");

  const [cached] = await db
    .select()
    .from(coachSummaries)
    .where(and(eq(coachSummaries.userId, userId), eq(coachSummaries.inputHash, ctx.inputHash)))
    .limit(1);
  if (cached) return { ...(cached.output as Omit<CoachSummary, "source">), source: "ai" };

  try {
    const res = await deepseekJson(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt(ctx) },
      ],
      { model: MODEL, maxTokens: 3000 },
    );
    const parsed = SCHEMA.parse(extractJson(res.content));
    const output = parsed;
    await db
      .insert(coachSummaries)
      .values({ userId, inputHash: ctx.inputHash, model: MODEL, output })
      .onConflictDoUpdate({
        target: coachSummaries.userId,
        set: { inputHash: ctx.inputHash, model: MODEL, output, updatedAt: new Date() },
      });
    return { ...output, source: "ai" };
  } catch (err) {
    // AI failed — the computed floor is always valid. Log so an outage shows.
    captureError(err, { op: "ai_coach", userId });
    return fallback(ctx);
  }
}
