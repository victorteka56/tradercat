import Link from "next/link";
import { notFound } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { requireUser } from "@/lib/auth";
import { getTradeById, getTradeFills } from "@/lib/queries/journal";
import { tradeLabel, tradeSubtitle } from "@/lib/trade-display";
import { usd, holdingLabel } from "@/lib/format";

const day = (d: Date | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export default async function TradeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const trade = await getTradeById(user.id, params.id);
  if (!trade) notFound();

  const fills = await getTradeFills(user.id, trade.id);
  const up = trade.netPnl >= 0;

  return (
    <main className="px-4 pt-14 lg:mx-auto lg:max-w-[900px] lg:pt-10">
      <Link
        href="/journal"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft"
      >
        ← Journal
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">
              {tradeLabel(trade)}
            </h1>
            <StatusChip tone={trade.direction === "long" ? "pos" : "neg"}>
              {trade.direction}
            </StatusChip>
            {trade.status === "open" && <StatusChip tone="info">Open</StatusChip>}
          </div>
          <div className="tnum mt-1 text-[13px] text-ink-soft">
            {tradeSubtitle(trade)}
          </div>
        </div>
        <div className="text-right">
          <div
            className={`tnum text-[24px] font-semibold ${
              up ? "text-pos" : "text-neg"
            }`}
          >
            {usd(trade.netPnl, { sign: true })}
          </div>
          <div className="text-[12px] text-ink-soft">realized</div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div>
          <SurfaceCard className="mb-4 grid grid-cols-3 divide-x divide-line">
            <Fact
              label="Avg entry"
              value={
                trade.avgEntryPrice != null ? `$${trade.avgEntryPrice}` : "—"
              }
            />
            <Fact
              label="Avg exit"
              value={trade.avgExitPrice != null ? `$${trade.avgExitPrice}` : "—"}
            />
            <Fact
              label="Held"
              value={
                trade.holdingSeconds != null
                  ? holdingLabel(trade.holdingSeconds)
                  : "—"
              }
            />
          </SurfaceCard>

          <SurfaceCard className="mb-4 grid grid-cols-2 gap-y-3 p-4">
            <KV label="Opened" value={String(trade.openedQty)} />
            <KV label="Closed" value={String(trade.closedQty)} />
            <KV label="Cost" value={usd(trade.cost)} />
            <KV label="Proceeds" value={usd(trade.proceeds)} />
            <KV label="First fill" value={day(trade.entryAt)} />
            <KV label="Last fill" value={day(trade.exitAt)} />
          </SurfaceCard>

          {/* R-multiple must never appear without a defined risk basis. */}
          <SurfaceCard className="mb-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">
                R-multiple
              </span>
              {trade.rMultiple != null && trade.riskSource ? (
                <span
                  className={`tnum text-[15px] font-semibold ${
                    trade.rMultiple >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {trade.rMultiple > 0 ? "+" : ""}
                  {trade.rMultiple.toFixed(2)}R
                </span>
              ) : (
                <StatusChip tone="neutral">Risk basis not set</StatusChip>
              )}
            </div>
            {trade.rMultiple == null && (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                Your broker export doesn&apos;t include a stop, so initial risk
                is unknown. Set a risk basis on the trade to get an R-multiple.
              </p>
            )}
          </SurfaceCard>
        </div>

        <div>
          {/* Excursions come from intraday candles — not invented. */}
          <SurfaceCard className="mb-4 p-4">
            <div className="mb-2 flex items-center gap-2">
              <StatusChip tone="neutral">MAE / MFE</StatusChip>
            </div>
            {trade.mae != null && trade.mfe != null ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Max adverse
                  </div>
                  <div className="tnum mt-1 text-[18px] font-semibold text-neg">
                    {usd(-trade.mae)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Max favorable
                  </div>
                  <div className="tnum mt-1 text-[18px] font-semibold text-pos">
                    {usd(trade.mfe, { sign: true })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Not computed yet. Measuring how far price moved for and against
                this trade needs intraday price history, which isn&apos;t
                connected yet.
              </p>
            )}
          </SurfaceCard>

          <SurfaceCard className="mb-4 p-4">
            <div className="mb-2">
              <StatusChip tone="neutral">AI trade review</StatusChip>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Available once excursions are computed. The review explains your
              numbers — it never invents them.
            </p>
          </SurfaceCard>
        </div>
      </div>

      <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Fills ({fills.length})
      </div>
      <SurfaceCard className="mb-6 overflow-hidden">
        <div className="divide-y divide-line">
          {fills.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="w-12 shrink-0 text-[12px] font-bold text-ink-soft">
                {f.code}
              </span>
              <span className="tnum flex-1 text-[12px] text-ink-faint">
                {day(f.executedAt)}
              </span>
              <span className="tnum w-12 text-right text-[12px] text-ink-soft">
                {f.quantity}
              </span>
              <span className="tnum w-16 text-right text-[12px] text-ink-soft">
                {f.price != null ? `$${f.price}` : "—"}
              </span>
              <span
                className={`tnum w-24 text-right text-[12px] font-semibold ${
                  f.amount >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(f.amount, { sign: true })}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="tnum mt-1 text-[15px] font-semibold text-ink">{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="tnum mt-0.5 text-[14px] font-semibold text-ink">
        {value}
      </div>
    </div>
  );
}
