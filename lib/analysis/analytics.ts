/**
 * All the journal analytics, computed from realized (complete, closed) trades.
 * Pure and deterministic — no LLM, no invented numbers — and framework-free, so
 * it runs on the client and recomputes instantly when the date filter changes.
 * The caller passes trades already filtered to realized + the chosen window.
 */

/** The minimal shape the analytics need — cheap to ship to the client. */
export interface AnalyticsTrade {
  pnl: number;
  kind: "option" | "stock" | "other";
  /** Contract direction — bought (long) vs written (short). */
  direction: "long" | "short";
  optionType: "call" | "put" | null;
  symbol: string;
  /** exit timestamp, epoch ms (null only for trades with no known close) */
  exitMs: number | null;
  holdingSeconds: number | null;
}

/**
 * Directional bias, not contract direction: which way you needed the underlying
 * to move. A bought put is a bearish (short) bet even though you're "long" the
 * contract, so it belongs on the short side of the Long-vs-short breakdown.
 *  long call / long stock / short put  → bullish (long)
 *  long put  / short stock / short call → bearish (short)
 */
function bias(t: AnalyticsTrade): "long" | "short" {
  if (t.kind === "option" && t.optionType) {
    const boughtBullish = t.optionType === "call"; // buying a call is bullish
    const bullish = t.direction === "long" ? boughtBullish : !boughtBullish;
    return bullish ? "long" : "short";
  }
  return t.direction;
}

export interface Bucket {
  key: string;
  label: string;
  trades: number;
  pnl: number;
  /** win rate 0–100 */
  winRate: number;
}

export interface DistBucket {
  label: string;
  count: number;
  tone: "pos" | "neg" | "neutral";
}

export interface Insight {
  tone: "pos" | "neg" | "neutral";
  title: string;
  detail: string;
}

export interface AnalyticsSummary {
  trades: number;
  netPnl: number;
  winRate: number;
  winners: number;
  losers: number;
  profitFactor: number | null;
  avgPerTrade: number;
  avgWin: number;
  avgLoss: number;
  /** avg win ÷ |avg loss| — the reward:risk you actually realize. */
  payoffRatio: number | null;
  /** deepest peak-to-trough on the realized-equity curve, in dollars. */
  maxDrawdown: number;
  /** average holding time in days, where known. */
  avgHoldDays: number | null;
  maxWinStreak: number;
  maxLossStreak: number;
  bestTradePnl: number;
  worstTradePnl: number;
}

export interface StreakStat {
  count: number;
  winRate: number;
  avgPnl: number;
}

/** Raw behavioural numbers — the visual "key findings" cards render from these. */
export interface BehaviorMetrics {
  avgWin: number;
  avgLoss: number;
  payoffRatio: number | null;
  avgHoldWinDays: number | null;
  avgHoldLossDays: number | null;
  afterLoss: StreakStat | null;
  afterWin: StreakStat | null;
  topProfitShare: number | null;
  worstLossShare: number | null;
}

export interface Analytics {
  summary: AnalyticsSummary;
  /** Behavioural findings — the "why", not just the "what". */
  behavior: Insight[];
  behaviorMetrics: BehaviorMetrics;
  /** Per-month trade count + P/L, oldest first. */
  monthly: Bucket[];
  insights: Insight[];
  byType: Bucket[];
  byDirection: Bucket[];
  byDayOfWeek: Bucket[];
  byHold: Bucket[];
  /** Every traded symbol, most-traded first. */
  symbols: Bucket[];
  distribution: DistBucket[];
}

const usd0 = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function bucketize(
  trades: AnalyticsTrade[],
  keyOf: (t: AnalyticsTrade) => string | null,
  labelOf: (key: string) => string,
): Bucket[] {
  const map = new Map<string, { trades: number; pnl: number; wins: number }>();
  for (const t of trades) {
    const k = keyOf(t);
    if (k == null) continue;
    const b = map.get(k) ?? { trades: 0, pnl: 0, wins: 0 };
    b.trades++;
    b.pnl += t.pnl;
    if (t.pnl > 0) b.wins++;
    map.set(k, b);
  }
  return [...map.entries()].map(([key, b]) => ({
    key,
    label: labelOf(key),
    trades: b.trades,
    pnl: b.pnl,
    winRate: b.trades ? Math.round((b.wins / b.trades) * 100) : 0,
  }));
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dowFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "America/New_York",
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-03" → "Mar '26" */
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
}

const days = (n: number) => (n < 1 ? "<1d" : n < 10 ? `${n.toFixed(1)}d` : `${Math.round(n)}d`);

function holdKey(t: AnalyticsTrade): string | null {
  if (t.holdingSeconds == null) return null;
  const days = t.holdingSeconds / 86400;
  if (days < 1) return "0";
  if (days <= 3) return "1";
  if (days <= 10) return "2";
  return "3";
}
const HOLD_LABEL: Record<string, string> = {
  "0": "Same day",
  "1": "1–3 days",
  "2": "4–10 days",
  "3": "10+ days",
};

export function computeAnalytics(trades: AnalyticsTrade[]): Analytics | null {
  if (trades.length === 0) return null;

  // Chronological for streaks.
  const chron = [...trades].sort((a, b) => (a.exitMs ?? 0) - (b.exitMs ?? 0));

  let netPnl = 0;
  let winners = 0;
  let losers = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let bestTradePnl = -Infinity;
  let worstTradePnl = Infinity;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;

  for (const t of chron) {
    netPnl += t.pnl;
    if (t.pnl > 0) {
      winners++;
      grossWin += t.pnl;
      curWin++;
      curLoss = 0;
      if (curWin > maxWinStreak) maxWinStreak = curWin;
    } else if (t.pnl < 0) {
      losers++;
      grossLoss += -t.pnl;
      curLoss++;
      curWin = 0;
      if (curLoss > maxLossStreak) maxLossStreak = curLoss;
    }
    if (t.pnl > bestTradePnl) bestTradePnl = t.pnl;
    if (t.pnl < worstTradePnl) worstTradePnl = t.pnl;
  }

  // Realized-equity drawdown (running peak → trough).
  let cum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of chron) {
    cum += t.pnl;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Holding time (days) overall + split by outcome — the behavioural signal.
  const holdDays = (t: AnalyticsTrade) =>
    t.holdingSeconds != null ? t.holdingSeconds / 86400 : null;
  let allHoldSum = 0, allHoldN = 0, winHoldSum = 0, winHoldN = 0, lossHoldSum = 0, lossHoldN = 0;
  for (const t of trades) {
    const d = holdDays(t);
    if (d == null) continue;
    allHoldSum += d;
    allHoldN++;
    if (t.pnl > 0) { winHoldSum += d; winHoldN++; }
    else if (t.pnl < 0) { lossHoldSum += d; lossHoldN++; }
  }
  const avgHoldWin = winHoldN ? winHoldSum / winHoldN : null;
  const avgHoldLoss = lossHoldN ? lossHoldSum / lossHoldN : null;

  const avgWin = winners ? grossWin / winners : 0;
  const avgLoss = losers ? -grossLoss / losers : 0;

  const summary: AnalyticsSummary = {
    trades: trades.length,
    netPnl,
    winRate: trades.length ? Math.round((winners / trades.length) * 100) : 0,
    winners,
    losers,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    avgPerTrade: netPnl / trades.length,
    avgWin,
    avgLoss,
    payoffRatio: avgWin > 0 && avgLoss < 0 ? avgWin / Math.abs(avgLoss) : null,
    maxDrawdown,
    avgHoldDays: allHoldN ? allHoldSum / allHoldN : null,
    maxWinStreak,
    maxLossStreak,
    bestTradePnl: bestTradePnl === -Infinity ? 0 : bestTradePnl,
    worstTradePnl: worstTradePnl === Infinity ? 0 : worstTradePnl,
  };

  // After a loss vs after a win — tilt / revenge detection.
  const streak = (want: "loss" | "win") => {
    let n = 0, wins = 0, pnl = 0;
    for (let i = 1; i < chron.length; i++) {
      const prev = chron[i - 1].pnl;
      if ((want === "loss" && prev < 0) || (want === "win" && prev > 0)) {
        n++;
        if (chron[i].pnl > 0) wins++;
        pnl += chron[i].pnl;
      }
    }
    return n ? { count: n, winRate: Math.round((wins / n) * 100), avgPnl: pnl / n } : null;
  };
  const afterLoss = streak("loss");
  const afterWin = streak("win");

  // Profit concentration — how much of the P/L a handful of trades carry.
  const wins = trades.filter((t) => t.pnl > 0).sort((a, b) => b.pnl - a.pnl);
  const losses = trades.filter((t) => t.pnl < 0).sort((a, b) => a.pnl - b.pnl);
  const top5Profit = wins.slice(0, 5).reduce((s, t) => s + t.pnl, 0);
  const worst5Loss = losses.slice(0, 5).reduce((s, t) => s + t.pnl, 0);
  const topProfitShare = grossWin > 0 ? (top5Profit / grossWin) * 100 : null;
  const worstLossShare = grossLoss > 0 ? (Math.abs(worst5Loss) / grossLoss) * 100 : null;

  const behavior = buildBehavior({
    trades: trades.length,
    avgHoldWin,
    avgHoldLoss,
    afterLoss,
    afterWin,
    topProfitShare,
    worstLossShare,
    lossers: losses.length,
    winnersCount: wins.length,
  });

  // Per-month activity.
  const monthMap = new Map<string, { trades: number; pnl: number; wins: number }>();
  for (const t of trades) {
    if (t.exitMs == null) continue;
    const d = new Date(t.exitMs);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthMap.get(key) ?? { trades: 0, pnl: 0, wins: 0 };
    m.trades++;
    m.pnl += t.pnl;
    if (t.pnl > 0) m.wins++;
    monthMap.set(key, m);
  }
  const monthly: Bucket[] = [...monthMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, m]) => ({
      key,
      label: monthLabel(key),
      trades: m.trades,
      pnl: m.pnl,
      winRate: m.trades ? Math.round((m.wins / m.trades) * 100) : 0,
    }));

  const byType = bucketize(
    trades,
    (t) => (t.kind === "option" ? "option" : t.kind === "stock" ? "stock" : null),
    (k) => (k === "option" ? "Options" : "Stocks"),
  );

  const byDirection = bucketize(
    trades,
    (t) => bias(t),
    (k) => (k === "long" ? "Long" : "Short"),
  );

  const byDayOfWeek = bucketize(
    trades,
    (t) => (t.exitMs != null ? dowFmt.format(new Date(t.exitMs)) : null),
    (k) => k,
  ).sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));

  const byHold = bucketize(trades, holdKey, (k) => HOLD_LABEL[k]).sort(
    (a, b) => Number(a.key) - Number(b.key),
  );

  const bySymbol = bucketize(
    trades,
    (t) => t.symbol,
    (k) => k,
  );

  // Fixed dollar bins — shows whether a few outliers carry the account.
  const bins: { label: string; test: (n: number) => boolean; tone: DistBucket["tone"] }[] = [
    { label: "≤ -$1k", test: (n) => n <= -1000, tone: "neg" },
    { label: "-$1k–250", test: (n) => n > -1000 && n <= -250, tone: "neg" },
    { label: "-$250–0", test: (n) => n > -250 && n < 0, tone: "neg" },
    { label: "$0–250", test: (n) => n >= 0 && n < 250, tone: "pos" },
    { label: "$250–1k", test: (n) => n >= 250 && n < 1000, tone: "pos" },
    { label: "≥ $1k", test: (n) => n >= 1000, tone: "pos" },
  ];
  const distribution: DistBucket[] = bins.map((bin) => ({
    label: bin.label,
    tone: bin.tone,
    count: trades.filter((t) => bin.test(t.pnl)).length,
  }));

  return {
    summary,
    insights: buildInsights(summary, { byType, byDirection, byDayOfWeek, byHold }),
    behavior,
    behaviorMetrics: {
      avgWin,
      avgLoss,
      payoffRatio: summary.payoffRatio,
      avgHoldWinDays: avgHoldWin,
      avgHoldLossDays: avgHoldLoss,
      afterLoss,
      afterWin,
      topProfitShare,
      worstLossShare,
    },
    monthly,
    byType,
    byDirection,
    byDayOfWeek,
    byHold,
    symbols: [...bySymbol].sort((a, b) => b.trades - a.trades),
    distribution,
  };
}

/**
 * A few plain-language takeaways, ranked by how much they matter. This is the
 * beginner's entry point — it reads the numbers so they don't have to.
 */
function buildInsights(
  s: AnalyticsSummary,
  b: {
    byType: Bucket[];
    byDirection: Bucket[];
    byDayOfWeek: Bucket[];
    byHold: Bucket[];
  },
): Insight[] {
  const out: Insight[] = [];

  // 1. Overall verdict.
  if (s.netPnl >= 0) {
    out.push({
      tone: "pos",
      title: `Net profitable — ${usd0(s.netPnl)} across ${s.trades} trades`,
      detail:
        s.profitFactor != null
          ? `Your profit factor is ${s.profitFactor.toFixed(2)} — you make $${s.profitFactor.toFixed(2)} for every $1 you lose.`
          : `You're in the green overall.`,
    });
  } else {
    out.push({
      tone: "neg",
      title: `Net negative — ${usd0(s.netPnl)} across ${s.trades} trades`,
      detail:
        s.profitFactor != null
          ? `Profit factor ${s.profitFactor.toFixed(2)} — you lose $${(1 / s.profitFactor).toFixed(2)} for every $1 you make.`
          : `Your losses outweigh your wins overall.`,
    });
  }

  // 2. The win-rate vs profit-factor trap — the single most useful beginner lesson.
  if (s.winRate >= 55 && s.profitFactor != null && s.profitFactor < 1) {
    out.push({
      tone: "neg",
      title: `You win often but still lose money`,
      detail: `A ${s.winRate}% win rate can't save you when losers (avg ${usd0(s.avgLoss)}) dwarf winners (avg ${usd0(s.avgWin)}). A few big losses erase many small wins.`,
    });
  } else if (s.winRate < 45 && s.profitFactor != null && s.profitFactor >= 1) {
    out.push({
      tone: "pos",
      title: `Low win rate, still profitable`,
      detail: `You only win ${s.winRate}% of the time, but your winners (avg ${usd0(s.avgWin)}) are far bigger than your losers (avg ${usd0(s.avgLoss)}). Let winners run.`,
    });
  }

  // 3. Biggest leak across the breakdowns (needs a few trades to be meaningful).
  const candidates = [...b.byType, ...b.byDirection, ...b.byDayOfWeek, ...b.byHold]
    .filter((x) => x.trades >= 5)
    .sort((a, c) => a.pnl - c.pnl);
  const worst = candidates[0];
  if (worst && worst.pnl < 0) {
    out.push({
      tone: "neg",
      title: `Biggest drag: ${worst.label}`,
      detail: `${worst.label} trades are down ${usd0(worst.pnl)} over ${worst.trades} trades (${worst.winRate}% win rate) — the area worth reviewing first.`,
    });
  }

  // 4. Biggest edge.
  const best = [...candidates].reverse()[0];
  if (best && best.pnl > 0 && best.key !== worst?.key) {
    out.push({
      tone: "pos",
      title: `Your edge: ${best.label}`,
      detail: `${best.label} trades are up ${usd0(best.pnl)} over ${best.trades} trades (${best.winRate}% win rate).`,
    });
  }

  return out.slice(0, 3);
}

/**
 * Behavioural findings — the patterns in *how* someone trades, not just what
 * they traded. These are the observations a coach would make.
 */
function buildBehavior(x: {
  trades: number;
  avgHoldWin: number | null;
  avgHoldLoss: number | null;
  afterLoss: { count: number; winRate: number; avgPnl: number } | null;
  afterWin: { count: number; winRate: number; avgPnl: number } | null;
  topProfitShare: number | null;
  worstLossShare: number | null;
  winnersCount: number;
  lossers: number;
}): Insight[] {
  const out: Insight[] = [];

  // Hold time: winners vs losers — the classic "cut winners, ride losers".
  if (x.avgHoldWin != null && x.avgHoldLoss != null && x.avgHoldWin > 0.02 && x.avgHoldLoss > 0.02) {
    if (x.avgHoldLoss >= x.avgHoldWin * 1.3) {
      out.push({
        tone: "neg",
        title: "You hold losers longer than winners",
        detail: `Losing trades sit ${days(x.avgHoldLoss)} on average versus ${days(x.avgHoldWin)} for winners — the classic "cut winners short, ride losers" pattern.`,
      });
    } else if (x.avgHoldWin >= x.avgHoldLoss * 1.3) {
      out.push({
        tone: "pos",
        title: "You let winners run",
        detail: `Winners are held ${days(x.avgHoldWin)} versus ${days(x.avgHoldLoss)} for losers — you give good trades room and cut the bad ones.`,
      });
    }
  }

  // Tilt: does a loss make the next trade worse?
  if (x.afterLoss && x.afterWin && x.afterLoss.count >= 10 && x.afterWin.count >= 10) {
    if (x.afterLoss.winRate + 7 < x.afterWin.winRate) {
      out.push({
        tone: "neg",
        title: "Losses seem to tilt you",
        detail: `Right after a loss you win only ${x.afterLoss.winRate}% (avg ${usd0(x.afterLoss.avgPnl)}), versus ${x.afterWin.winRate}% after a win. Watch for revenge trades.`,
      });
    } else {
      out.push({
        tone: "pos",
        title: "You stay steady after a loss",
        detail: `Your win rate after a loss (${x.afterLoss.winRate}%) holds up against after a win (${x.afterWin.winRate}%) — no obvious tilt.`,
      });
    }
  }

  // Concentration: is the account carried (or sunk) by a few trades?
  if (x.topProfitShare != null && x.winnersCount >= 8 && x.topProfitShare >= 55) {
    out.push({
      tone: "neutral",
      title: "Your profit is concentrated",
      detail: `Your top 5 winners make up ${Math.round(x.topProfitShare)}% of all gains — remove them and the picture changes a lot. A thin edge to lean on.`,
    });
  } else if (x.worstLossShare != null && x.lossers >= 8 && x.worstLossShare >= 55) {
    out.push({
      tone: "neg",
      title: "A few trades did most of the damage",
      detail: `Your 5 worst losers account for ${Math.round(x.worstLossShare)}% of all losses — tightening those alone would move the needle most.`,
    });
  }

  return out.slice(0, 3);
}
