import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  AllocationDonut,
  UnrealizedChart,
  type AllocationSlice,
  type ChartHolding,
} from "@/components/portfolio/PortfolioCharts";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import {
  ValueCard,
  SignalsCard,
  type StatRow,
} from "@/components/portfolio/SummaryCards";
import { AccountsCard } from "@/components/portfolio/AccountsCard";
import { requireUser } from "@/lib/auth";
import { getPortfolio, type AssetClass } from "@/lib/queries/brokerage";
import { usd } from "@/lib/format";
import { tradeLabel } from "@/lib/trade-display";
import { ASSET_COLOR, ASSET_LABEL, PALETTE, NEG, lighten } from "@/lib/chart-colors";
import { Wallet, Layers, Receipt, PieChart, TrendingDown, CalendarClock } from "lucide-react";

const CLASSES: AssetClass[] = ["option", "stock", "fund", "crypto"];

const DAY_MS = 86_400_000;

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
          <h2 className="text-[17px] font-semibold text-ink">Connect a brokerage</h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-soft">
            Live holdings, balances and allocation come straight from your broker.
            Read-only — TraderCat never sees your credentials.
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

  const invested = p.totalMarketValue;
  // The brokerages' own account total — NOT cash + holdings, which double-counted
  // every position back when `balance` (an account total) was treated as cash.
  const totalValue = p.totalValue || invested + (p.cash ?? 0);
  const up = p.totalUnrealizedPnl >= 0;
  // Return on what's actually at risk — cash would dilute it into meaninglessness.
  const returnPct =
    p.totalCostBasis > 0 ? (p.totalUnrealizedPnl / p.totalCostBasis) * 100 : null;

  /* ---- allocation: one ring slice per holding, one legend row per class ---- */
  // Hue = asset class, lightness = rank within that class. Successive holdings
  // step 18% lighter (capped) so even a long tail stays distinguishable while
  // the class stays obvious.
  const ring: AllocationSlice[] = [];
  const legend: AllocationSlice[] = [];

  for (const cls of CLASSES) {
    const held = p.holdings
      .filter((h) => h.assetClass === cls && (h.marketValue ?? 0) > 0)
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
    if (held.length === 0) continue;

    const base = ASSET_COLOR[cls];
    held.forEach((h, i) => {
      ring.push({
        key: h.id,
        label: h.symbol,
        color: lighten(base, Math.min(0.55, i * 0.18)),
        value: h.marketValue as number,
      });
    });
    legend.push({
      key: cls,
      label: ASSET_LABEL[cls],
      color: base,
      value: held.reduce((s, h) => s + (h.marketValue ?? 0), 0),
    });
  }

  if ((p.cash ?? 0) > 0) {
    const cashSlice = {
      key: "cash",
      label: ASSET_LABEL.cash,
      color: ASSET_COLOR.cash,
      value: p.cash as number,
    };
    ring.push(cashSlice);
    legend.push(cashSlice);
  }

  const chartHoldings: ChartHolding[] = p.holdings.map((h) => ({
    id: h.id,
    label: tradeLabel(h),
    marketValue: h.marketValue,
    costBasis: h.costBasis,
    unrealizedPnl: h.unrealizedPnl,
  }));

  /* ---- the "what's going on" line: three facts worth acting on ---- */
  const largest = p.holdings[0]; // already sorted by market value
  const drag = [...p.holdings]
    .filter((h) => h.unrealizedPnl != null)
    .sort((a, b) => (a.unrealizedPnl as number) - (b.unrealizedPnl as number))[0];
  const nextExpiry = p.holdings
    .filter((h) => h.assetClass === "option" && h.expiry)
    .sort((a, b) => +new Date(a.expiry!) - +new Date(b.expiry!))[0];
  const daysToExpiry = nextExpiry
    ? Math.ceil((+new Date(nextExpiry.expiry!) - Date.now()) / DAY_MS)
    : null;

  const stats: StatRow[] = [
    {
      label: "Cash",
      value: p.cash == null ? "—" : usd(p.cash),
      icon: Wallet,
      color: PALETTE.teal,
    },
    {
      label: "Invested",
      value: usd(invested),
      sub: `${p.holdings.length} position${p.holdings.length === 1 ? "" : "s"}`,
      icon: Layers,
      color: PALETTE.slate,
    },
    {
      label: "Cost basis",
      value: p.totalCostBasis > 0 ? usd(p.totalCostBasis) : "—",
      icon: Receipt,
      color: PALETTE.violet,
    },
  ];

  const signals: StatRow[] = [];
  if (largest && totalValue > 0) {
    signals.push({
      label: "Largest position",
      value: tradeLabel(largest),
      sub: `${(((largest.marketValue ?? 0) / totalValue) * 100).toFixed(1)}% of total value`,
      icon: PieChart,
      color: PALETTE.slate,
    });
  }
  if (drag && (drag.unrealizedPnl as number) < 0) {
    signals.push({
      label: "Biggest drag",
      value: usd(drag.unrealizedPnl as number, { sign: true }),
      sub: tradeLabel(drag),
      icon: TrendingDown,
      color: NEG,
      tone: "neg",
    });
  }
  if (nextExpiry && daysToExpiry != null) {
    signals.push({
      label: "Nearest expiry",
      value: `${daysToExpiry} days`,
      sub: `${tradeLabel(nextExpiry)} · ${new Date(nextExpiry.expiry!).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", timeZone: "UTC" },
      )}`,
      icon: CalendarClock,
      color: PALETTE.amber,
    });
  }

  return (
    <main className="px-4 pb-10 pt-14 lg:pt-10">
      <header className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
          Portfolio
        </h1>
        <StatusChip tone="pos">Live</StatusChip>
        {p.lastSyncAt && (
          <span className="tnum ml-auto text-[11.5px] text-ink-faint">
            Synced{" "}
            {new Date(p.lastSyncAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </header>

      {/*
        Mosaic: CSS multi-column balances the cards by height, so a short card
        never strands empty space beneath it the way a fixed grid row does.
        Source order decides what lands first — allocation leads because the
        ring wants the most room.
      */}
      <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <SurfaceCard className="p-5">
          <div className="text-[13px] font-semibold text-ink">Allocation</div>
          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            Each position&apos;s share of total value, shaded by asset class.
          </p>
          <AllocationDonut ring={ring} legend={legend} height={330} />
        </SurfaceCard>

        <ValueCard
          totalValue={usd(totalValue)}
          changeLabel={`${usd(p.totalUnrealizedPnl, { sign: true })}${
            returnPct != null
              ? ` (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%)`
              : ""
          }`}
          up={up}
          stats={stats}
        />

        <SignalsCard signals={signals} />

        {chartHoldings.some((h) => h.unrealizedPnl != null) && (
          <SurfaceCard className="p-4">
            <div className="text-[13px] font-semibold text-ink">
              Open P/L by position
            </div>
            <p className="mb-2 text-[11.5px] leading-relaxed text-ink-soft">
              Unrealized gain or loss against cost basis.
            </p>
            <UnrealizedChart holdings={chartHoldings} />
          </SurfaceCard>
        )}

        <SurfaceCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Accounts</h2>
            <Link href="/import" className="text-[12px] font-semibold text-info">
              Manage
            </Link>
          </div>
          <AccountsCard accounts={p.accounts} />
        </SurfaceCard>
      </div>

      {/* ---- the detail ---- */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[14px] font-semibold text-ink">
            Holdings{" "}
            <span className="tnum font-medium text-ink-faint">
              ({p.holdings.length})
            </span>
          </h2>
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
            <HoldingsTable holdings={p.holdings} totalValue={totalValue} />
          </SurfaceCard>
        )}
      </div>
    </main>
  );
}
