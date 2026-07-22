import { EmptyJournal } from "@/components/journal/EmptyJournal";
import { JournalShell } from "@/components/journal/JournalShell";
import { JournalTableMui } from "@/components/journal/JournalTableMui";
import { JournalCalendar } from "@/components/journal/JournalCalendar";
import { requireUser } from "@/lib/auth";
import {
  getDailyPnl,
  getJournalStats,
  getTradeHighlights,
  getTrades,
} from "@/lib/queries/journal";
import { getJournalView } from "./view-actions";

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
    <JournalShell stats={stats} highlights={highlights} view={view}>
      {view === "calendar" ? (
        <div className="px-1">
          <JournalCalendar days={daily} />
        </div>
      ) : (
        <JournalTableMui trades={all} />
      )}
    </JournalShell>
  );
}
