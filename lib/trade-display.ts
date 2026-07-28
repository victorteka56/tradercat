import type { JournalTrade } from "@/lib/queries/journal";

/** "AVGO $300 Put" for options, plain symbol for stock. */
export function tradeLabel(t: {
  symbol: string;
  kind: string;
  optionType: "call" | "put" | null;
  strike: number | null;
}): string {
  if (t.kind === "option" && t.optionType && t.strike != null) {
    const type = t.optionType === "call" ? "Call" : "Put";
    return `${t.symbol} $${t.strike} ${type}`;
  }
  return t.symbol;
}

/**
 * Whether a trade has a realized P/L worth showing.
 *
 * Open positions haven't realized anything, and incomplete ones are missing the
 * cost basis needed to compute it. Both render as "—" rather than a $0.00 that
 * would read as a real, break-even result.
 */
export const hasRealizedPnl = (t: { status: string; incomplete: boolean }): boolean =>
  t.status === "closed" && !t.incomplete;

export function tradeSubtitle(t: JournalTrade): string {
  if (t.kind === "option" && t.expiry) {
    return `Exp ${new Date(t.expiry).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      // Stored at UTC midnight; format in UTC so the date can't slip a day.
      timeZone: "UTC",
    })}`;
  }
  return t.description || "Stock";
}
