import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { requireUser } from "@/lib/auth";
import { getPortfolio } from "@/lib/queries/brokerage";
import { usd, pct } from "@/lib/format";
import { tradeLabel } from "@/lib/trade-display";

const colors = ["#3a5a9c", "#17915f", "#c68a1d", "#7a5cff", "#8b94a3"];

export default async function PortfolioPage() {
  const user = await requireUser();
  const p = await getPortfolio(user.id);

  if (!p.hasConnection) {
    return (
      <main className="px-4 pt-14 lg:pt-10">
        <h1 className="mb-4 text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Portfolio
        </h1>
        <SurfaceCard className="p-8 text-center lg:mx-auto lg:max-w-xl">
          <h2 className="text-[17px] font-semibold text-ink">
            Connect a brokerage
          </h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-soft">
            Live holdings, balances and allocation come straight from your
            broker. Read-only — TraderCat never sees your credentials.
          </p>
          <Link
            href="/import"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white hover:bg-ink/90"
          >
            Connect brokerage
          </Link>
        </SurfaceCard>
      </main>
    );
  }

  const totalValue = p.totalMarketValue + p.cash;
  const invested = p.totalMarketValue;

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Portfolio
        </h1>
        <StatusChip tone="pos">Live</StatusChip>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div>
          <SurfaceCard className="mb-4 p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Total value
            </div>
            <div className="tnum mt-1 text-[30px] font-semibold text-ink">
              {usd(totalValue)}
            </div>
            <div
              className={`tnum mt-1 text-[14px] font-semibold ${
                p.totalUnrealizedPnl >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {usd(p.totalUnrealizedPnl, { sign: true })} unrealized
            </div>
            {p.lastSyncAt && (
              <div className="tnum mt-1 text-[11px] text-ink-faint">
                Synced{" "}
                {new Date(p.lastSyncAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
          </SurfaceCard>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <MetricCard label="Cash" value={usd(p.cash)} />
            <MetricCard label="Invested" value={usd(invested)} />
          </div>
        </div>

        <div className="mt-4 lg:mt-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-semibold text-ink">
              Holdings ({p.holdings.length})
            </h2>
            <Link href="/import" className="text-[13px] font-semibold text-info">
              Manage
            </Link>
          </div>

          {p.holdings.length === 0 ? (
            <SurfaceCard className="p-8 text-center">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                No open positions. Your closed trades live in the{" "}
                <Link href="/journal" className="font-semibold text-info">
                  Journal
                </Link>
                .
              </p>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="overflow-hidden">
              {invested > 0 && (
                <div className="flex h-2.5 w-full overflow-hidden">
                  {p.holdings.map((h, i) => (
                    <div
                      key={h.id}
                      style={{
                        width: `${((h.marketValue ?? 0) / invested) * 100}%`,
                        background: colors[i % colors.length],
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="divide-y divide-line">
                {p.holdings.map((h, i) => {
                  const alloc = invested > 0 ? ((h.marketValue ?? 0) / invested) * 100 : 0;
                  return (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: colors[i % colors.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-ink">
                          {tradeLabel(h)}
                        </div>
                        <div className="tnum truncate text-[11px] text-ink-soft">
                          {h.quantity} @ {h.averageCost != null ? `$${h.averageCost}` : "—"}
                          {alloc > 0 ? ` · ${alloc.toFixed(1)}%` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tnum text-[14px] font-semibold text-ink">
                          {h.marketValue != null ? usd(h.marketValue) : "—"}
                        </div>
                        {h.unrealizedPnl != null && (
                          <div
                            className={`tnum text-[11px] font-medium ${
                              h.unrealizedPnl >= 0 ? "text-pos" : "text-neg"
                            }`}
                          >
                            {usd(h.unrealizedPnl, { sign: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>
    </main>
  );
}
