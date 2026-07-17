import Link from "next/link";
import { Trade } from "@/lib/data";
import { usd, rMultiple, shortDate, holdingLabel } from "@/lib/format";
import { StatusChip } from "./StatusChip";

export function TradeRow({ trade }: { trade: Trade }) {
  const up = trade.netPnl >= 0;
  return (
    <Link
      href={`/journal/${trade.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
    >
      {/* Direction squircle */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${
          trade.direction === "long"
            ? "bg-pos/10 text-pos"
            : "bg-neg/10 text-neg"
        }`}
      >
        {trade.direction === "long" ? "LONG" : "SHRT"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-ink">
            {trade.symbol}
          </span>
          {trade.status === "open" && <StatusChip tone="info">Open</StatusChip>}
        </div>
        <div className="tnum mt-0.5 text-[12px] text-ink-soft">
          {shortDate(trade.entryAt)} · {trade.quantity} sh ·{" "}
          {holdingLabel(trade.holdingSeconds)}
        </div>
      </div>

      <div className="text-right">
        <div
          className={`tnum text-[15px] font-semibold ${
            up ? "text-pos" : "text-neg"
          }`}
        >
          {usd(trade.netPnl, { sign: true })}
        </div>
        {trade.status === "closed" && (
          <div
            className={`tnum mt-0.5 text-[12px] font-medium ${
              trade.rMultiple >= 0 ? "text-pos" : "text-neg"
            }`}
          >
            {rMultiple(trade.rMultiple)}
          </div>
        )}
      </div>
    </Link>
  );
}
