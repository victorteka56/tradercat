import type { JournalTrade } from "@/lib/queries/journal";

/**
 * Where a trade came from. Synced brokerage trades carry the institution name;
 * file imports read "CSV" — the distinction matters because only synced trades
 * carry execution times, and therefore excursions.
 */
export function sourceLabel(t: Pick<JournalTrade, "source" | "brokerName">): string {
  if (t.source === "snaptrade") return t.brokerName ?? "Brokerage";
  return "CSV";
}

export function SourceBadge({
  trade,
}: {
  trade: Pick<JournalTrade, "source" | "brokerName">;
}) {
  const synced = trade.source === "snaptrade";
  return (
    <span
      title={synced ? "Synced from your brokerage" : "Imported from a CSV file"}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        synced ? "bg-info/10 text-info" : "bg-surface-2 text-ink-faint"
      }`}
    >
      {sourceLabel(trade)}
    </span>
  );
}
