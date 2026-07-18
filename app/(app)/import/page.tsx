import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { requireUser } from "@/lib/auth";
import { getJournalStats, getRecentImports } from "@/lib/queries/journal";
import { getConnections } from "@/lib/queries/brokerage";
import { ImportForm } from "./ImportForm";
import { ClearButton } from "./ClearButton";
import { BrokerageCard } from "./BrokerageCard";
import { DevTools } from "./DevTools";
import { getDevCounts } from "./dev-actions";

const DEV = process.env.NODE_ENV !== "production";

export default async function ImportPage() {
  const user = await requireUser();
  const [stats, imports, connections, devCounts] = await Promise.all([
    getJournalStats(user.id),
    getRecentImports(user.id),
    getConnections(user.id),
    DEV ? getDevCounts(user.id) : Promise.resolve(null),
  ]);

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <header className="mb-4">
        <Link
          href="/journal"
          className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft lg:hidden"
        >
          ← Journal
        </Link>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Import trades
        </h1>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="space-y-4">
          <ImportForm />

          <SurfaceCard className="p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              How to export from Robinhood
            </div>
            <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-soft">
              <li>1. Robinhood → Account → Menu → Reports and statements.</li>
              <li>2. Generate an account activity report as CSV.</li>
              <li>3. Upload it here.</li>
            </ol>
            <p className="mt-2 border-t border-line pt-2 text-[12px] leading-relaxed text-ink-faint">
              Re-importing is safe — fills are matched on a content key, so
              overlapping exports won&apos;t double-count.
            </p>
          </SurfaceCard>
        </div>

        <div className="mt-4 space-y-4 lg:mt-0">
          <BrokerageCard connections={connections} />

          {stats.totalTrades > 0 && (
            <SurfaceCard className="p-4">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                In your journal
              </div>
              <div className="tnum mt-1 text-[24px] font-semibold text-ink">
                {stats.totalTrades.toLocaleString()} trades
              </div>
              <div className="tnum mt-0.5 text-[13px] text-ink-soft">
                {stats.optionTrades} options · {stats.stockTrades} stocks
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <ClearButton />
              </div>
            </SurfaceCard>
          )}

          {imports.length > 0 && (
            <SurfaceCard className="overflow-hidden">
              <div className="border-b border-line px-4 py-3 text-[13px] font-semibold text-ink">
                Recent imports
              </div>
              <div className="divide-y divide-line">
                {imports.map((im) => (
                  <div
                    key={im.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {im.fileName}
                      </div>
                      <div className="tnum text-[11px] text-ink-faint">
                        {im.rowCount.toLocaleString()} rows ·{" "}
                        {new Date(im.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <StatusChip
                      tone={
                        im.status === "completed"
                          ? "pos"
                          : im.status === "failed"
                          ? "neg"
                          : "amber"
                      }
                    >
                      {im.status}
                    </StatusChip>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>

      {DEV && devCounts && <DevTools userId={user.id} initial={devCounts} />}
    </main>
  );
}
