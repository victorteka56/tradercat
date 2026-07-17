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

export function tradeSubtitle(t: JournalTrade): string {
  if (t.kind === "option" && t.expiry) {
    return `Exp ${new Date(t.expiry).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return t.description || "Stock";
}
