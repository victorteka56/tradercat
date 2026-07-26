import { describe, it, expect } from "vitest";
import { computeAnalytics, type AnalyticsTrade } from "./analytics";

/**
 * The analytics engine is pure and drives every stat, chart and the AI coach's
 * context — so these tests pin the headline math (win rate, profit factor,
 * payoff) and the newer behaviour reads (R expectancy, sessions, overtrading).
 */

const DAY = 86_400_000;
const base = new Date("2026-03-02T00:00:00Z").getTime(); // a Monday

function trade(over: Partial<AnalyticsTrade>): AnalyticsTrade {
  return {
    pnl: 0,
    kind: "stock",
    direction: "long",
    optionType: null,
    symbol: "AAPL",
    exitMs: base,
    entryMs: base,
    entryHasTime: false,
    holdingSeconds: null,
    rMultiple: null,
    ...over,
  };
}

describe("computeAnalytics — summary", () => {
  it("returns null with no trades", () => {
    expect(computeAnalytics([])).toBeNull();
  });

  it("computes win rate, profit factor and payoff ratio", () => {
    const a = computeAnalytics([
      trade({ pnl: 100 }),
      trade({ pnl: 100 }),
      trade({ pnl: 100 }),
      trade({ pnl: -150 }),
    ])!;
    expect(a.summary.trades).toBe(4);
    expect(a.summary.winRate).toBe(75);
    expect(a.summary.netPnl).toBe(150);
    expect(a.summary.avgWin).toBe(100);
    expect(a.summary.avgLoss).toBe(-150);
    expect(a.summary.payoffRatio).toBeCloseTo(0.667, 2); // 100 / 150
    expect(a.summary.profitFactor).toBeCloseTo(2, 5); // 300 / 150
  });

  it("surfaces the win-rate trap: high win rate, still losing", () => {
    // 3 small wins, 1 big loss → win rate 75% but net negative.
    const a = computeAnalytics([
      trade({ pnl: 50 }),
      trade({ pnl: 50 }),
      trade({ pnl: 50 }),
      trade({ pnl: -300 }),
    ])!;
    expect(a.summary.winRate).toBe(75);
    expect(a.summary.netPnl).toBe(-150);
    expect(a.summary.profitFactor).toBeLessThan(1);
  });
});

describe("computeAnalytics — R-multiple stats", () => {
  it("is null when no trade is scored", () => {
    const a = computeAnalytics([trade({ pnl: 100 }), trade({ pnl: -50 })])!;
    expect(a.rStats).toBeNull();
  });

  it("averages R only over scored trades", () => {
    const a = computeAnalytics([
      trade({ pnl: 200, rMultiple: 2 }),
      trade({ pnl: -100, rMultiple: -1 }),
      trade({ pnl: 300, rMultiple: null }), // unscored — excluded
    ])!;
    expect(a.rStats).not.toBeNull();
    expect(a.rStats!.scored).toBe(2);
    expect(a.rStats!.avgR).toBeCloseTo(0.5, 5); // (2 + -1) / 2
    expect(a.rStats!.avgWinR).toBe(2);
    expect(a.rStats!.avgLossR).toBe(-1);
    expect(a.rStats!.best).toBe(2);
    expect(a.rStats!.worst).toBe(-1);
  });
});

describe("computeAnalytics — sessions (time of day)", () => {
  it("is null without enough intraday trades", () => {
    const a = computeAnalytics([trade({ pnl: 10, entryHasTime: false })])!;
    expect(a.bySession).toBeNull();
  });

  it("buckets intraday entries by market session", () => {
    // 2026-03-02 is still EST (UTC-5); US DST starts Mar 8. So ET = UTC-5 here.
    const at = (hUtc: number) => new Date(Date.UTC(2026, 2, 2, hUtc, 0)).getTime();
    const trades = [
      // 15:00 UTC = 10:00 ET → open (9:30–11)
      ...Array.from({ length: 3 }, () => trade({ pnl: -20, entryMs: at(15), entryHasTime: true })),
      // 18:00 UTC = 13:00 ET → midday (11–14)
      ...Array.from({ length: 3 }, () => trade({ pnl: 30, entryMs: at(18), entryHasTime: true })),
    ];
    const a = computeAnalytics(trades)!;
    expect(a.bySession).not.toBeNull();
    const labels = a.bySession!.map((b) => b.key);
    expect(labels).toContain("open");
    expect(labels).toContain("mid");
    const open = a.bySession!.find((b) => b.key === "open")!;
    expect(open.pnl).toBe(-60);
  });
});

describe("computeAnalytics — overtrading", () => {
  it("bins days by trade count and averages the day's P/L", () => {
    // A quiet day (1 trade, +100) and a busy day (4 trades on another date, net -400).
    const quietDay = new Date("2026-03-02T20:00:00Z").getTime();
    const busyDay = new Date("2026-03-03T20:00:00Z").getTime();
    // pad to >=5 distinct days so the read is enabled
    const extra = [4, 5, 6, 9].map((d) =>
      trade({ pnl: 10, exitMs: new Date(`2026-03-0${d}T20:00:00Z`).getTime() }),
    );
    const trades = [
      trade({ pnl: 100, exitMs: quietDay }),
      ...Array.from({ length: 4 }, () => trade({ pnl: -100, exitMs: busyDay })),
      ...extra,
    ];
    const a = computeAnalytics(trades)!;
    expect(a.overtrading).not.toBeNull();
    const busyBin = a.overtrading!.find((b) => b.label === "4–6 trades")!;
    expect(busyBin.days).toBe(1);
    expect(busyBin.avgDayPnl).toBe(-400);
  });
});
