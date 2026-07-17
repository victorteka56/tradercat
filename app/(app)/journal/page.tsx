import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyJournal } from "@/components/journal/EmptyJournal";
import { JournalTradeRow } from "@/components/journal/JournalTradeRow";
import { requireUser } from "@/lib/auth";
import { getJournalStats, getTrades } from "@/lib/queries/journal";
import { usd } from "@/lib/format";
import { tradeLabel } from "@/lib/trade-display";

type Filter = "all" | "wins" | "losses" | "options" | "stocks" | "open";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "options", label: "Options" },
  { key: "stocks", label: "Stocks" },
  { key: "open", label: "Open" },
];

export default async function JournalPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string };
}) {
  const user = await requireUser();
  const [stats, all] = await Promise.all([
    getJournalStats(user.id),
    getTrades(user.id),
  ]);

  if (stats.totalTrades === 0) return <EmptyJournal />;

  const filter = (searchParams.filter ?? "all") as Filter;
  const q = (searchParams.q ?? "").trim().toUpperCase();

  let list = all;
  if (filter === "wins") list = list.filter((t) => t.netPnl > 0);
  else if (filter === "losses") list = list.filter((t) => t.netPnl < 0);
  else if (filter === "options") list = list.filter((t) => t.kind === "option");
  else if (filter === "stocks") list = list.filter((t) => t.kind === "stock");
  else if (filter === "open") list = list.filter((t) => t.status === "open");
  if (q) list = list.filter((t) => tradeLabel(t).toUpperCase().includes(q));

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
        <Link
          href="/import"
          className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Import
        </Link>
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

      {/* Filters are links so the list stays a server component. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/journal" : `/journal?filter=${f.key}`}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <SurfaceCard className="divide-y divide-line overflow-hidden">
        {list.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-soft">
            No trades match this filter.
          </div>
        ) : (
          list.map((t) => <JournalTradeRow key={t.id} trade={t} />)
        )}
      </SurfaceCard>

      <p className="mt-4 text-center text-[11px] text-ink-faint">
        Showing {list.length.toLocaleString()} of{" "}
        {stats.totalTrades.toLocaleString()} trades
      </p>
    </main>
  );
}
