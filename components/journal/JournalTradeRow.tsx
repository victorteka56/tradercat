import Link from "next/link";
import { StatusChip } from "@/components/ui/StatusChip";
import { SourceBadge } from "@/components/journal/SourceBadge";
import type { JournalTrade } from "@/lib/queries/journal";
import { tradeLabel, tradeSubtitle } from "@/lib/trade-display";
import { usd, holdingLabel } from "@/lib/format";

export function JournalTradeRow({ trade }: { trade: JournalTrade }) {
  const up = trade.netPnl >= 0;
  const when = trade.exitAt ?? trade.entryAt;

  return (
    <Link
      href={`/journal/${trade.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
          trade.direction === "long"
            ? "bg-pos/10 text-pos"
            : "bg-neg/10 text-neg"
        }`}
      >
        {trade.direction === "long" ? "LONG" : "SHORT"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">
            {tradeLabel(trade)}
          </span>
          <SourceBadge trade={trade} />
          {trade.status === "open" && <StatusChip tone="info">Open</StatusChip>}
        </div>
        <div className="tnum mt-0.5 truncate text-[11px] text-ink-soft">
          {tradeSubtitle(trade)}
          {when
            ? ` · ${new Date(when).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}`
            : ""}
          {trade.holdingSeconds != null
            ? ` · ${holdingLabel(trade.holdingSeconds)}`
            : ""}
        </div>
      </div>

      <div className="text-right">
        <div
          className={`tnum text-[14px] font-semibold ${
            up ? "text-pos" : "text-neg"
          }`}
        >
          {usd(trade.netPnl, { sign: true })}
        </div>
        {trade.rMultiple != null && (
          <div
            className={`tnum mt-0.5 text-[11px] font-medium ${
              trade.rMultiple >= 0 ? "text-pos" : "text-neg"
            }`}
          >
            {trade.rMultiple > 0 ? "+" : ""}
            {trade.rMultiple.toFixed(2)}R
          </div>
        )}
      </div>
    </Link>
  );
}
