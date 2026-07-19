import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { JournalTradeRow } from "@/components/journal/JournalTradeRow";
import { EquityPanel } from "@/components/journal/EquityPanel";
import { requireUser } from "@/lib/auth";
import {
  getJournalStats,
  getRealizedSeries,
  getTrades,
} from "@/lib/queries/journal";
import { usd } from "@/lib/format";

export default async function HomePage() {
  const user = await requireUser();
  const [stats, recent, series] = await Promise.all([
    getJournalStats(user.id),
    getTrades(user.id, { limit: 5 }),
    getRealizedSeries(user.id),
  ]);

  const name = user.displayName?.split(" ")[0] ?? "there";
  const hasData = stats.totalTrades > 0;

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-ink-faint">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
            Welcome back, {name}
          </h1>
        </div>
      </header>

      {!hasData ? (
        <SurfaceCard className="p-8 text-center lg:mx-auto lg:max-w-xl">
          <h2 className="text-[17px] font-semibold text-ink">
            Let&apos;s build your journal
          </h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-soft">
            Import your broker&apos;s activity export and TraderCat rebuilds
            your trades from the raw fills.
          </p>
          <Link
            href="/import"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white hover:bg-ink/90"
          >
            Import trades
          </Link>
        </SurfaceCard>
      ) : (
        <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
          <div className="space-y-4 lg:col-span-2">
            <EquityPanel series={series} title="Realized P/L" />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Win rate"
                value={`${stats.winRate}%`}
                sub={`${stats.winners}W · ${stats.losers}L`}
              />
              <MetricCard
                label="Profit factor"
                value={
                  stats.profitFactor != null
                    ? stats.profitFactor.toFixed(2)
                    : "—"
                }
                tone={
                  stats.profitFactor != null && stats.profitFactor >= 1
                    ? "pos"
                    : "neg"
                }
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

            <SurfaceCard className="p-4">
              <div className="mb-1.5">
                <StatusChip tone="neutral">Journal insight</StatusChip>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Insights arrive once excursions are computed from intraday price
                history. TraderCat explains your numbers — it won&apos;t invent
                them.
              </p>
            </SurfaceCard>
          </div>

          <div className="mt-4 space-y-2 lg:mt-0">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[15px] font-semibold text-ink">
                Recent trades
              </h2>
              <Link href="/journal" className="text-[13px] font-semibold text-info">
                View all
              </Link>
            </div>
            <SurfaceCard className="divide-y divide-line overflow-hidden">
              {recent.map((t) => (
                <JournalTradeRow key={t.id} trade={t} />
              ))}
            </SurfaceCard>
          </div>
        </div>
      )}
    </main>
  );
}
