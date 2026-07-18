import "server-only";

import { createHash } from "node:crypto";
import type { ParsedFill } from "@/lib/import/robinhood";

/**
 * Maps SnapTrade activities onto the same normalized fill shape the CSV parser
 * produces, so both feeds converge on one reconstruction pipeline.
 *
 * The win over CSV: real execution timestamps and structured option fields, so
 * nothing here depends on regexing a human-readable description.
 */

export interface SnapTradeFill extends ParsedFill {
  optionType: "call" | "put" | null;
  strike: number | null;
  expiry: Date | null;
  externalId: string | null;
}

/** SnapTrade's action verbs -> the broker codes reconstruction already knows. */
function toCode(type?: string | null, optionAction?: string | null): string | null {
  const action = (optionAction ?? "").toUpperCase();
  if (action === "BUY_TO_OPEN") return "BTO";
  if (action === "SELL_TO_CLOSE") return "STC";
  if (action === "SELL_TO_OPEN") return "STO";
  if (action === "BUY_TO_CLOSE") return "BTC";

  switch ((type ?? "").toUpperCase()) {
    case "BUY":
      return "Buy";
    case "SELL":
      return "Sell";
    case "OPTIONEXPIRATION":
      return "OEXP";
    case "OPTIONASSIGNMENT":
    case "OPTIONEXERCISE":
      return "OASGN";
    default:
      return null; // dividends, interest, transfers — not position-affecting
  }
}

interface RawActivity {
  id?: string;
  type?: string;
  option_type?: string;
  trade_date?: string;
  price?: number | null;
  units?: number | null;
  amount?: number | null;
  fee?: number | null;
  description?: string;
  currency?: { code?: string };
  symbol?: { symbol?: string; description?: string } | null;
  option_symbol?: {
    ticker?: string;
    option_type?: string;
    strike_price?: number;
    expiration_date?: string;
    underlying_symbol?: { symbol?: string };
  } | null;
}

export interface MapResult {
  fills: SnapTradeFill[];
  skipped: number;
  /** True when the feed carries real times, not just midnight dates. */
  hasExecutionTimes: boolean;
}

export function mapActivitiesToFills(
  activities: unknown[],
  accountId: string,
): MapResult {
  const fills: SnapTradeFill[] = [];
  let skipped = 0;
  let timed = 0;
  let dated = 0;

  // Same occurrence-index guard as the CSV path: identical fills are real and
  // must not collapse into one.
  const seen = new Map<string, number>();

  for (const raw of activities as RawActivity[]) {
    const code = toCode(raw.type, raw.option_type);
    if (!code) {
      skipped++;
      continue;
    }
    if (!raw.trade_date) {
      skipped++;
      continue;
    }

    const executedAt = new Date(raw.trade_date);
    if (Number.isNaN(executedAt.getTime())) {
      skipped++;
      continue;
    }

    const opt = raw.option_symbol ?? null;
    const symbol =
      opt?.underlying_symbol?.symbol ?? raw.symbol?.symbol ?? null;
    if (!symbol) {
      skipped++;
      continue;
    }

    const rawType = String(opt?.option_type ?? "").toLowerCase();
    const optionType = rawType === "call" || rawType === "put" ? rawType : null;

    dated++;
    if (executedAt.getUTCHours() || executedAt.getUTCMinutes() || executedAt.getUTCSeconds()) {
      timed++;
    }

    /**
     * SnapTrade's activity id is the natural key, but their docs warn it "can
     * change if the transaction is deleted and re-added". So the key blends the
     * id with the content — a re-issued id for identical content still dedupes.
     */
    const content = [
      "snaptrade",
      accountId,
      raw.id ?? "",
      symbol,
      opt?.ticker ?? "",
      executedAt.toISOString(),
      code,
      raw.units ?? "",
      raw.price ?? "",
      raw.amount ?? "",
    ].join("|");
    const n = seen.get(content) ?? 0;
    seen.set(content, n + 1);

    fills.push({
      symbol,
      description: opt?.ticker ?? raw.symbol?.description ?? raw.description ?? "",
      code,
      quantity: Math.abs(Number(raw.units ?? 0)),
      price: raw.price == null ? null : Number(raw.price),
      amount: Number(raw.amount ?? 0),
      executedAt,
      idempotencyKey: createHash("sha256").update(`${content}#${n}`).digest("hex"),
      raw: raw as unknown as Record<string, string>,
      optionType,
      strike: opt?.strike_price == null ? null : Number(opt.strike_price),
      expiry: opt?.expiration_date ? new Date(opt.expiration_date) : null,
      externalId: raw.id ?? null,
    });
  }

  return {
    fills,
    skipped,
    // Report what the feed actually gives rather than assuming per-broker.
    hasExecutionTimes: dated > 0 && timed / dated > 0.5,
  };
}
