import {
  CLOSE_LONG,
  CLOSE_OTHER,
  CLOSE_SHORT,
  OPEN_LONG,
  OPEN_SHORT,
} from "./robinhood";

/**
 * Groups fills into trades. Pure — takes fills that already exist in the DB
 * (so they carry ids) and returns the trades + legs to upsert.
 *
 * Positions are grouped per contract (options) or per instrument (stock).
 * Realized P/L is the sum of the signed amounts, which is exact regardless of
 * how round-trips are split, so this stays correct even when the same contract
 * is traded repeatedly.
 */

export interface ReconFill {
  id: string;
  symbol: string;
  description: string;
  code: string;
  quantity: number;
  price: number | null;
  amount: number;
  executedAt: Date;
}

export interface TradeLegDraft {
  fillId: string;
  legType: "entry" | "exit";
  quantity: number;
  price: number | null;
  executedAt: Date;
}

export interface TradeDraft {
  groupKey: string;
  symbol: string;
  description: string | null;
  kind: "option" | "stock" | "other";
  direction: "long" | "short";
  status: "open" | "closed";
  optionType: "call" | "put" | null;
  strike: number | null;
  expiry: Date | null;
  openedQty: number;
  closedQty: number;
  avgEntryPrice: number | null;
  avgExitPrice: number | null;
  cost: number;
  proceeds: number;
  netPnl: number;
  entryAt: Date | null;
  exitAt: Date | null;
  holdingSeconds: number | null;
  legs: TradeLegDraft[];
}

export interface ParsedOption {
  underlying: string;
  expiry: Date;
  optionType: "call" | "put";
  strike: number;
}

/**
 * Matches an option contract anywhere in the description. Robinhood is not
 * consistent: trades read "AVGO 3/27/2026 Put $300.00", while expirations read
 * "Option Expiration for AMD 2/20/2026 Call $270.00". Anchoring to the start
 * silently misfiled every expiration as a stock position and left the expired
 * contract marked open, so we scan instead.
 */
export function parseOptionDescription(desc: string): ParsedOption | null {
  const m = desc.match(
    /(\S+)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(Call|Put)\s+\$?([\d,.]+)/i,
  );
  if (!m) return null;
  const [, underlying, mm, dd, yyyy, type, strike] = m;
  return {
    underlying,
    expiry: new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))),
    optionType: type.toLowerCase() as "call" | "put",
    strike: parseFloat(strike.replace(/,/g, "")),
  };
}

const round = (n: number, dp = 8) => Number(n.toFixed(dp));

export function reconstructTrades(fills: ReconFill[]): TradeDraft[] {
  const groups = new Map<string, ReconFill[]>();

  for (const f of fills) {
    const opt = parseOptionDescription(f.description);
    // Options key on the contract; stocks key on the instrument.
    const groupKey = opt
      ? `opt:${f.symbol}:${opt.optionType}:${opt.strike}:${opt.expiry
          .toISOString()
          .slice(0, 10)}`
      : `stk:${f.symbol}`;
    const list = groups.get(groupKey);
    if (list) list.push(f);
    else groups.set(groupKey, [f]);
  }

  const drafts: TradeDraft[] = [];

  for (const [groupKey, groupFills] of groups) {
    groupFills.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());

    const opt = parseOptionDescription(groupFills[0].description);
    const kind: "option" | "stock" | "other" = opt ? "option" : "stock";

    let openedQty = 0;
    let closedQty = 0;
    let openNotional = 0;
    let openQtyPriced = 0;
    let closeNotional = 0;
    let closeQtyPriced = 0;
    let cost = 0;
    let proceeds = 0;
    let netPnl = 0;
    let openLong = 0;
    let openShort = 0;
    let entryAt: Date | null = null;
    let exitAt: Date | null = null;

    const legs: TradeLegDraft[] = [];

    for (const f of groupFills) {
      netPnl += f.amount;
      if (f.amount >= 0) proceeds += f.amount;
      else cost += -f.amount;

      const isOpen = OPEN_LONG.has(f.code) || OPEN_SHORT.has(f.code);
      const isClose =
        CLOSE_LONG.has(f.code) ||
        CLOSE_SHORT.has(f.code) ||
        CLOSE_OTHER.has(f.code);

      if (isOpen) {
        openedQty += f.quantity;
        if (OPEN_SHORT.has(f.code)) openShort += f.quantity;
        else openLong += f.quantity;
        if (f.price != null) {
          openNotional += f.quantity * f.price;
          openQtyPriced += f.quantity;
        }
        if (!entryAt || f.executedAt < entryAt) entryAt = f.executedAt;
        legs.push({
          fillId: f.id,
          legType: "entry",
          quantity: f.quantity,
          price: f.price,
          executedAt: f.executedAt,
        });
      } else if (isClose) {
        closedQty += f.quantity;
        // Expiration/assignment carry no meaningful price — exclude from avg.
        if (f.price != null && !CLOSE_OTHER.has(f.code)) {
          closeNotional += f.quantity * f.price;
          closeQtyPriced += f.quantity;
        }
        if (!exitAt || f.executedAt > exitAt) exitAt = f.executedAt;
        legs.push({
          fillId: f.id,
          legType: "exit",
          quantity: f.quantity,
          price: f.price,
          executedAt: f.executedAt,
        });
      }
    }

    const direction: "long" | "short" = openShort > openLong ? "short" : "long";
    // Closed once everything opened has been closed out. Fills that only close
    // a position opened before the export window leave openedQty at 0 — we
    // can't see the open, so we don't claim it's closed.
    const status: "open" | "closed" =
      openedQty > 0 && closedQty + 1e-8 >= openedQty ? "closed" : "open";

    const holdingSeconds =
      entryAt && exitAt && status === "closed"
        ? Math.max(0, Math.round((exitAt.getTime() - entryAt.getTime()) / 1000))
        : null;

    drafts.push({
      groupKey,
      symbol: groupFills[0].symbol,
      description: groupFills[0].description || null,
      kind,
      direction,
      status,
      optionType: opt?.optionType ?? null,
      strike: opt?.strike ?? null,
      expiry: opt?.expiry ?? null,
      openedQty: round(openedQty),
      closedQty: round(closedQty),
      avgEntryPrice: openQtyPriced ? round(openNotional / openQtyPriced) : null,
      avgExitPrice: closeQtyPriced ? round(closeNotional / closeQtyPriced) : null,
      cost: round(cost, 2),
      proceeds: round(proceeds, 2),
      netPnl: round(netPnl, 2),
      entryAt,
      exitAt: status === "closed" ? exitAt : null,
      holdingSeconds,
      legs,
    });
  }

  return drafts;
}
