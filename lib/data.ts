// Dummy data for the starter UI. Mirrors the AGENTS.md Postgres model
// (fills -> trade_legs -> trades, MAE/MFE, risk_source, tags) but static.

export type Direction = "long" | "short";
export type RiskSource = "stop" | "manual" | "inferred";

export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  status: "open" | "closed";
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  entryAt: string;
  exitAt: string;
  netPnl: number;
  rMultiple: number;
  riskSource: RiskSource;
  holdingSeconds: number;
  mae: number; // max adverse excursion ($ against you)
  mfe: number; // max favorable excursion ($ in your favor)
  capturedPct: number; // % of the favorable move you actually kept
  tags: { label: string; kind: "setup" | "mistake" | "emotion" }[];
  review: string; // pre-computed AI narrative (compute-then-narrate)
}

export const trades: Trade[] = [
  {
    id: "t_1042",
    symbol: "NVDA",
    direction: "long",
    status: "closed",
    quantity: 120,
    avgEntryPrice: 118.4,
    avgExitPrice: 123.1,
    entryAt: "2026-07-08T13:41:00Z",
    exitAt: "2026-07-08T15:02:00Z",
    netPnl: 564,
    rMultiple: 2.35,
    riskSource: "stop",
    holdingSeconds: 4860,
    mae: 96,
    mfe: 912,
    capturedPct: 62,
    tags: [
      { label: "Breakout", kind: "setup" },
      { label: "Cut winner early", kind: "mistake" },
    ],
    review:
      "Clean breakout entry near the prior day high with minimal adverse excursion ($96 against you). You exited into strength but captured only 62% of the favorable move — price extended a further $348 after your fill. On your last three breakout trades you have exited before the momentum peaked; consider scaling out rather than closing full size.",
  },
  {
    id: "t_1041",
    symbol: "TSLA",
    direction: "short",
    status: "closed",
    quantity: 60,
    avgEntryPrice: 254.2,
    avgExitPrice: 251.9,
    entryAt: "2026-07-08T14:10:00Z",
    exitAt: "2026-07-08T14:38:00Z",
    netPnl: 138,
    rMultiple: 0.9,
    riskSource: "stop",
    holdingSeconds: 1680,
    mae: 72,
    mfe: 210,
    capturedPct: 66,
    tags: [{ label: "Fade", kind: "setup" }],
    review:
      "A tidy fade of an extended move. Risk was well defined and the trade never went more than $72 against you. Exit timing was reasonable — you kept 66% of the move before the bounce.",
  },
  {
    id: "t_1040",
    symbol: "AAPL",
    direction: "long",
    status: "closed",
    quantity: 200,
    avgEntryPrice: 211.05,
    avgExitPrice: 209.4,
    entryAt: "2026-07-07T17:22:00Z",
    exitAt: "2026-07-07T19:55:00Z",
    netPnl: -330,
    rMultiple: -1.1,
    riskSource: "manual",
    holdingSeconds: 9180,
    mae: 388,
    mfe: 92,
    capturedPct: 0,
    tags: [
      { label: "Reversal", kind: "setup" },
      { label: "Held past stop", kind: "mistake" },
      { label: "FOMO", kind: "emotion" },
    ],
    review:
      "The entry chased a move that had already run — favorable excursion was only $92 before it rolled over. You held roughly 40 minutes past your stated risk level, turning a small loss into a -1.1R. This is your second held-past-stop trade this week; the pattern, not the setup, is the risk to review.",
  },
  {
    id: "t_1039",
    symbol: "AMD",
    direction: "long",
    status: "closed",
    quantity: 150,
    avgEntryPrice: 168.9,
    avgExitPrice: 172.35,
    entryAt: "2026-07-07T13:35:00Z",
    exitAt: "2026-07-07T14:48:00Z",
    netPnl: 517,
    rMultiple: 1.8,
    riskSource: "stop",
    holdingSeconds: 4380,
    mae: 110,
    mfe: 640,
    capturedPct: 81,
    tags: [{ label: "Trend continuation", kind: "setup" }],
    review:
      "Strong execution. Entered on the pullback, held through a shallow $110 adverse excursion, and captured 81% of the favorable move — your best capture rate this week.",
  },
  {
    id: "t_1038",
    symbol: "SPY",
    direction: "short",
    status: "open",
    quantity: 80,
    avgEntryPrice: 561.2,
    avgExitPrice: 0,
    entryAt: "2026-07-09T13:50:00Z",
    exitAt: "",
    netPnl: 96,
    rMultiple: 0,
    riskSource: "stop",
    holdingSeconds: 5400,
    mae: 60,
    mfe: 180,
    capturedPct: 0,
    tags: [{ label: "Fade", kind: "setup" }],
    review:
      "Open position. Currently $96 in favor with a defined stop. No review until the trade closes and the full excursion is known.",
  },
];

export const journalStats = {
  winRate: 62,
  expectancy: 0.74, // R
  profitFactor: 2.1,
  avgWinner: 466,
  avgLoser: -218,
  netPnl30d: 4820,
  tradesThisWeek: 12,
  streakDays: 6,
};

// Equity curve points (cumulative $ P/L) for a simple sparkline / chart.
export const equityCurve = [
  0, 210, 140, 690, 520, 1180, 980, 1650, 1420, 2110, 2640, 2380, 3120, 3560,
  3290, 3990, 4310, 4180, 4620, 4820,
];

export const portfolio = {
  totalValue: 84250.32,
  cash: 12430.1,
  dayChange: 612.44,
  dayChangePct: 0.73,
  unrealizedPnl: 6840.2,
  holdings: [
    { symbol: "NVDA", value: 24120, allocationPct: 28.6, dayPct: 1.9 },
    { symbol: "AAPL", value: 15380, allocationPct: 18.3, dayPct: -0.4 },
    { symbol: "AMD", value: 11260, allocationPct: 13.4, dayPct: 1.1 },
    { symbol: "MSFT", value: 9840, allocationPct: 11.7, dayPct: 0.2 },
    { symbol: "SPY", value: 8220, allocationPct: 9.8, dayPct: 0.5 },
  ],
  risk: {
    level: "moderate" as const,
    topConcentration: 28.6,
    note: "NVDA is 28.6% of the book — single-position concentration is the main exposure to review.",
  },
};

export const watchlist = [
  { symbol: "META", last: 512.4, changePct: 1.24, premarketPct: 0.4 },
  { symbol: "GOOGL", last: 182.1, changePct: -0.62, premarketPct: -0.2 },
  { symbol: "COIN", last: 241.8, changePct: 3.9, premarketPct: 1.6 },
  { symbol: "PLTR", last: 28.6, changePct: 2.1, premarketPct: 0.8 },
];
