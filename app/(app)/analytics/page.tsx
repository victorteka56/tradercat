import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { EquityCurve } from "@/components/ui/EquityCurve";
import { journalStats, equityCurve } from "@/lib/data";
import { usd } from "@/lib/format";

// Static R-distribution buckets for the starter.
const rBuckets = [
  { label: "-3R", count: 1, tone: "neg" },
  { label: "-2R", count: 1, tone: "neg" },
  { label: "-1R", count: 3, tone: "neg" },
  { label: "0R", count: 1, tone: "neutral" },
  { label: "+1R", count: 4, tone: "pos" },
  { label: "+2R", count: 3, tone: "pos" },
  { label: "+3R", count: 2, tone: "pos" },
] as const;

const bySetup = [
  { setup: "Breakout", winRate: 68, pnl: 2140 },
  { setup: "Trend continuation", winRate: 74, pnl: 1680 },
  { setup: "Fade", winRate: 55, pnl: 640 },
  { setup: "Reversal", winRate: 41, pnl: -420 },
];

export default function AnalyticsPage() {
  const maxCount = Math.max(...rBuckets.map((b) => b.count));

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Analytics
        </h1>
        <StatusChip tone="amber">Sample data</StatusChip>
      </div>
      <p className="mb-4 text-[12.5px] text-ink-soft">
        Not wired to your imports yet — your real numbers live in{" "}
        <Link href="/journal" className="font-semibold text-info">
          Journal
        </Link>
        .
      </p>

      <SurfaceCard className="mb-4 p-4">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          Equity curve · 30 days
        </div>
        <div className="tnum mb-2 text-[24px] font-semibold text-pos">
          {usd(journalStats.netPnl30d, { sign: true })}
        </div>
        <EquityCurve points={equityCurve} height={140} />
      </SurfaceCard>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Win rate"
          value={`${journalStats.winRate}%`}
          tone="ink"
        />
        <MetricCard
          label="Expectancy"
          value={`${journalStats.expectancy.toFixed(2)}R`}
          tone="pos"
        />
        <MetricCard
          label="Avg winner"
          value={usd(journalStats.avgWinner, { sign: true })}
          tone="pos"
        />
        <MetricCard
          label="Avg loser"
          value={usd(journalStats.avgLoser, { sign: true })}
          tone="neg"
        />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      {/* R-distribution */}
      <SurfaceCard className="mb-4 p-4 lg:mb-0">
        <div className="mb-3 text-[13px] font-semibold text-ink">
          R-multiple distribution
        </div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
          {rBuckets.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-md ${
                  b.tone === "pos"
                    ? "bg-pos"
                    : b.tone === "neg"
                    ? "bg-neg"
                    : "bg-ink-faint"
                }`}
                style={{ height: `${(b.count / maxCount) * 76}px` }}
              />
              <span className="text-[10px] font-medium text-ink-faint">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Performance by setup */}
      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-[13px] font-semibold text-ink">
          Performance by setup
        </div>
        <div className="divide-y divide-line">
          {bySetup.map((s) => (
            <div key={s.setup} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[14px] font-semibold text-ink">{s.setup}</div>
                <div className="tnum text-[12px] text-ink-soft">
                  {s.winRate}% win rate
                </div>
              </div>
              <div
                className={`tnum text-[14px] font-semibold ${
                  s.pnl >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(s.pnl, { sign: true })}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
      </div>
    </main>
  );
}
