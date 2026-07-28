import Link from "next/link";
import type { JournalTrade, TradeHighlights } from "@/lib/queries/journal";
import { tradeLabel } from "@/lib/trade-display";
import { usd } from "@/lib/format";

const fmtPct = (t: JournalTrade): string =>
  t.pnlPct == null ? "—" : `${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(1)}%`;

function Card({
  eyebrow,
  trade,
  mode,
}: {
  eyebrow: string;
  trade: JournalTrade | null;
  mode: "usd" | "pct";
}) {
  if (!trade) {
    return (
      <div className="rounded-card border border-line bg-surface p-3 shadow-card">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
          {eyebrow}
        </div>
        <div className="mt-1.5 text-[18px] font-semibold text-ink-faint">—</div>
        <div className="mt-0.5 text-[11.5px] text-ink-faint">No trades yet</div>
      </div>
    );
  }

  const up = trade.netPnl >= 0;
  const tone = up ? "text-pos" : "text-neg";
  const primary = mode === "usd" ? usd(trade.netPnl, { sign: true }) : fmtPct(trade);
  const secondary = mode === "usd" ? fmtPct(trade) : usd(trade.netPnl, { sign: true });

  return (
    <Link
      href={`/journal/${trade.id}`}
      className="group rounded-card border border-line bg-surface p-3 shadow-card transition-colors hover:border-ink/20 hover:bg-surface-2"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
          {eyebrow}
        </div>
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
      <div className={`tnum mt-1.5 text-[18px] font-semibold ${tone}`}>{primary}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5 truncate text-[11.5px]">
        <span className="truncate font-semibold text-ink">{tradeLabel(trade)}</span>
        <span className="tnum shrink-0 text-ink-faint">{secondary}</span>
      </div>
    </Link>
  );
}

/** Four clickable "extreme trade" cards — each links to that trade's detail. */
export function HighlightCards({ highlights }: { highlights: TradeHighlights }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card eyebrow="Largest Gain" trade={highlights.biggestGain} mode="usd" />
      <Card eyebrow="Largest Loss" trade={highlights.biggestLoss} mode="usd" />
      <Card eyebrow="Best Return" trade={highlights.bestReturn} mode="pct" />
      <Card eyebrow="Worst Return" trade={highlights.worstReturn} mode="pct" />
    </div>
  );
}
