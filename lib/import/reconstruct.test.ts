import { describe, it, expect } from "vitest";
import { reconstructTrades, type ReconFill } from "./reconstruct";

/**
 * The reconstruction engine turns raw broker fills into trades with P/L. This
 * is the money math the whole app rests on, so these tests pin the behaviours
 * that were bugs before (open trades reporting cost as loss, options past
 * expiry, missing opening fills) and the core accounting.
 */

let seq = 0;
function fill(over: Partial<ReconFill>): ReconFill {
  return {
    id: `f${seq++}`,
    symbol: "AAPL",
    description: "AAPL",
    code: "BTO",
    quantity: 1,
    price: 1,
    amount: -1,
    executedAt: new Date("2026-01-05T15:00:00Z"),
    ...over,
  };
}

const one = (fills: ReconFill[]) => {
  const drafts = reconstructTrades(fills, new Date("2026-06-01T00:00:00Z"));
  expect(drafts).toHaveLength(1);
  return drafts[0];
};

describe("reconstructTrades — stock round trips", () => {
  it("computes P/L, cost and proceeds for a simple winner", () => {
    const t = one([
      fill({ code: "Buy", quantity: 100, price: 10, amount: -1000, executedAt: new Date("2026-01-05T15:00:00Z") }),
      fill({ code: "Sell", quantity: 100, price: 12, amount: 1200, executedAt: new Date("2026-01-06T15:00:00Z") }),
    ]);
    expect(t.status).toBe("closed");
    expect(t.direction).toBe("long");
    expect(t.cost).toBe(1000);
    expect(t.proceeds).toBe(1200);
    expect(t.netPnl).toBe(200);
    expect(t.avgEntryPrice).toBe(10);
    expect(t.avgExitPrice).toBe(12);
    expect(t.incomplete).toBe(false);
  });

  it("nets P/L across scaled entries and exits", () => {
    const t = one([
      fill({ code: "Buy", quantity: 50, price: 10, amount: -500 }),
      fill({ code: "Buy", quantity: 50, price: 20, amount: -1000 }),
      fill({ code: "Sell", quantity: 100, price: 18, amount: 1800, executedAt: new Date("2026-01-07T15:00:00Z") }),
    ]);
    expect(t.openedQty).toBe(100);
    expect(t.closedQty).toBe(100);
    expect(t.cost).toBe(1500);
    expect(t.proceeds).toBe(1800);
    expect(t.netPnl).toBe(300);
    expect(t.avgEntryPrice).toBe(15); // (500+1000)/100
  });
});

describe("reconstructTrades — open positions", () => {
  it("leaves an open trade with null P/L (never books cost as a loss)", () => {
    const t = one([fill({ code: "Buy", quantity: 100, price: 10, amount: -1000 })]);
    expect(t.status).toBe("open");
    expect(t.netPnl).toBeNull(); // the bug we fixed: open P/L must not be -1000
    expect(t.closedQty).toBe(0);
    expect(t.exitAt).toBeNull();
  });

  it("is open when more was opened than closed", () => {
    const t = one([
      fill({ code: "Buy", quantity: 100, price: 10, amount: -1000 }),
      fill({ code: "Sell", quantity: 40, price: 11, amount: 440, executedAt: new Date("2026-01-06T15:00:00Z") }),
    ]);
    expect(t.status).toBe("open");
    expect(t.openedQty).toBe(100);
    expect(t.closedQty).toBe(40);
  });
});

describe("reconstructTrades — incomplete history", () => {
  it("flags a trade incomplete when we closed more than we opened", () => {
    // Only the sell is in the feed — the opening buy predates the window.
    const t = one([
      fill({ code: "Sell", quantity: 100, price: 12, amount: 1200, executedAt: new Date("2026-01-06T15:00:00Z") }),
    ]);
    expect(t.incomplete).toBe(true);
    expect(t.status).toBe("closed"); // nothing is held
  });
});

describe("reconstructTrades — options", () => {
  const optExpiryFuture = {
    optionType: "call" as const,
    strike: 400,
    expiry: new Date("2026-10-16T00:00:00Z"),
  };

  it("keeps a held option open before expiry", () => {
    const t = one([
      fill({ symbol: "TSLA", code: "BTO", quantity: 10, price: 6.75, amount: -6750, ...optExpiryFuture }),
    ]);
    expect(t.kind).toBe("option");
    expect(t.status).toBe("open");
    expect(t.optionType).toBe("call");
    expect(t.strike).toBe(400);
  });

  it("forces an option closed once past expiry even with no exit fill", () => {
    const t = one([
      fill({
        symbol: "TSLA",
        code: "BTO",
        quantity: 10,
        price: 6.75,
        amount: -6750,
        optionType: "call",
        strike: 400,
        expiry: new Date("2026-02-01T00:00:00Z"), // before the "now" of 2026-06-01
      }),
    ]);
    expect(t.status).toBe("closed");
    expect(t.exitAt).not.toBeNull();
  });

  it("separates two contracts of the same underlying into distinct trades", () => {
    const drafts = reconstructTrades(
      [
        fill({ symbol: "TSLA", code: "BTO", quantity: 1, price: 5, amount: -500, optionType: "call", strike: 400, expiry: new Date("2026-10-16T00:00:00Z") }),
        fill({ symbol: "TSLA", code: "BTO", quantity: 1, price: 3, amount: -300, optionType: "call", strike: 370, expiry: new Date("2026-10-16T00:00:00Z") }),
      ],
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(drafts).toHaveLength(2);
  });
});

describe("reconstructTrades — scoping", () => {
  it("keeps the same symbol at two brokers as separate trades", () => {
    const drafts = reconstructTrades(
      [
        fill({ code: "Buy", quantity: 10, price: 10, amount: -100, scope: "acct:a" }),
        fill({ code: "Sell", quantity: 10, price: 11, amount: 110, scope: "acct:a", executedAt: new Date("2026-01-06T15:00:00Z") }),
        fill({ code: "Buy", quantity: 10, price: 10, amount: -100, scope: "acct:b" }),
      ],
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(drafts).toHaveLength(2);
    const byScope = drafts.map((d) => d.groupKey.split("|")[0]).sort();
    expect(byScope).toEqual(["acct:a", "acct:b"]);
  });
});
