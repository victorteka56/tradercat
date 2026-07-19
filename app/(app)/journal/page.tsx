import Link from "next/link";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyJournal } from "@/components/journal/EmptyJournal";
import { JournalTable } from "@/components/journal/JournalTable";
import { JournalCalendar } from "@/components/journal/JournalCalendar";
import { JournalViewToggle } from "@/components/journal/JournalViewToggle";
import { HighlightCards } from "@/components/journal/HighlightCards";
import { requireUser } from "@/lib/auth";
import {
  getDailyPnl,
  getJournalStats,
  getTradeHighlights,
  getTrades,
} from "@/lib/queries/journal";
import { getJournalView } from "./view-actions";
import { usd } from "@/lib/format";

export default async function JournalPage() {
  const user = await requireUser();
  const [stats, all, view, daily, highlights] = await Promise.all([
    getJournalStats(user.id),
    getTrades(user.id),
    getJournalView(user.id),
    getDailyPnl(user.id),
    getTradeHighlights(user.id),
  ]);

  if (stats.totalTrades === 0) return <EmptyJournal />;

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
            Journal
          </h1>
          <p className="tnum mt-0.5 text-[13px] text-ink-soft">
            {stats.totalTrades.toLocaleString()} trades ·{" "}
            <span className={stats.netPnl >= 0 ? "text-pos" : "text-neg"}>
              {usd(stats.netPnl, { sign: true })} realized
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JournalViewToggle current={view} />
          <Link
            href="/import"
            className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Import
          </Link>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Realized P/L"
          value={usd(stats.netPnl, { sign: true })}
          tone={stats.netPnl >= 0 ? "pos" : "neg"}
          sub={`${stats.closedTrades} closed`}
        />
        <MetricCard
          label="Win rate"
          value={`${stats.winRate}%`}
          sub={`${stats.winners}W · ${stats.losers}L`}
        />
        <MetricCard
          label="Avg winner"
          value={usd(stats.avgWinner, { sign: true })}
          tone="pos"
        />
        <MetricCard
          label="Avg loser"
          value={usd(stats.avgLoser, { sign: true })}
          tone="neg"
        />
      </div>

      <div className="mb-4">
        <HighlightCards highlights={highlights} />
      </div>

      {view === "calendar" ? (
        <JournalCalendar days={daily} />
      ) : (
        <JournalTable trades={all} />
      )}
    </main>
  );
}
