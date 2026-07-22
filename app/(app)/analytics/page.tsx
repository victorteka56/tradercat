import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { requireUser } from "@/lib/auth";
import { getTrades } from "@/lib/queries/journal";
import type { AnalyticsTrade } from "@/lib/analysis/analytics";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const all = await getTrades(user.id, { limit: 5000 });

  // Ship only what the analytics need — realized trades, minimal fields — so the
  // whole page can filter and recompute client-side per date range.
  const trades: AnalyticsTrade[] = all
    .filter((t) => t.status === "closed" && !t.incomplete)
    .map((t) => ({
      pnl: t.netPnl,
      kind: t.kind,
      direction: t.direction,
      optionType: t.optionType,
      symbol: t.symbol,
      exitMs: t.exitAt ? new Date(t.exitAt).getTime() : null,
      holdingSeconds: t.holdingSeconds,
    }));

  if (trades.length === 0) {
    return (
      <main className="px-4 pt-14 lg:mx-auto lg:max-w-[1160px] lg:pt-10">
        <h1 className="mb-4 text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Analytics
        </h1>
        <SurfaceCard className="p-8 text-center">
          <h2 className="text-[17px] font-semibold text-ink">No realized trades yet</h2>
          <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
            Analytics build from your closed trades. Import a broker export or
            connect your brokerage and they&apos;ll fill in here.
          </p>
          <Link
            href="/import"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white hover:bg-ink/90"
          >
            Import trades
          </Link>
        </SurfaceCard>
      </main>
    );
  }

  return <AnalyticsView trades={trades} />;
}
