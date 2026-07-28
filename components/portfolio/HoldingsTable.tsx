import { usd } from "@/lib/format";
import { ASSET_COLOR, ASSET_LABEL } from "@/lib/chart-colors";
import type { AssetClass, HoldingView } from "@/lib/queries/brokerage";

/**
 * Holdings as a real table, grouped by asset class.
 *
 * Grouping is what separates crypto from equity and options without a legend:
 * each section carries the class colour used by the allocation donut, plus its
 * own subtotal, so the sections answer "how much of each" before you read a
 * single row. Colour lives on the section header rather than on every row —
 * a bullet per line adds noise without adding information.
 */

/** Order sections by how much of a trading book they usually dominate. */
const ORDER: AssetClass[] = ["option", "stock", "fund", "crypto"];

/** Sub-dollar prices (coins, cheap contracts) need more precision than cents. */
function price(n: number | null): string {
  if (n === null) return "—";
  const a = Math.abs(n);
  if (a === 0) return "$0.00";
  if (a < 1) return `$${n.toPrecision(3)}`;
  return usd(n);
}

/** Whole numbers stay clean; fractional shares keep only what they need. */
function qty(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return String(Number(n.toFixed(6)));
}

function expiryLabel(d: Date | null): string | null {
  if (!d) return null;
  // Stored at UTC midnight — format in UTC so the date can't slip a day.
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function subtitle(h: HoldingView): string {
  if (h.assetClass === "option") {
    const type = h.optionType === "call" ? "Call" : h.optionType === "put" ? "Put" : "";
    const exp = expiryLabel(h.expiry);
    return [type, exp && `Exp ${exp}`].filter(Boolean).join(" · ");
  }
  return h.description || ASSET_LABEL[h.assetClass];
}

export function HoldingsTable({
  holdings,
  totalValue,
}: {
  holdings: HoldingView[];
  totalValue: number;
}) {
  const groups = ORDER.map((cls) => ({
    cls,
    rows: holdings.filter((h) => h.assetClass === cls),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            <th className="px-4 py-2.5 font-semibold">Position</th>
            <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Account</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">
              Avg cost
            </th>
            <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">
              Last
            </th>
            <th className="px-3 py-2.5 text-right font-semibold">Value</th>
            <th className="px-3 py-2.5 text-right font-semibold">Open P/L</th>
            <th className="px-4 py-2.5 text-right font-semibold">Weight</th>
          </tr>
        </thead>

        {groups.map(({ cls, rows }) => {
          const value = rows.reduce((s, h) => s + (h.marketValue ?? 0), 0);
          const pnl = rows.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0);
          const hasPnl = rows.some((h) => h.unrealizedPnl != null);

          return (
            <tbody key={cls}>
              {/* Section header — the class colour, count and subtotal. Its cells
                  mirror the body row one-for-one, including the same responsive
                  hiding, so subtotals stay under their columns at every width. */}
              <tr className="bg-surface-2/60">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: ASSET_COLOR[cls] }}
                    />
                    <span className="text-[12px] font-semibold text-ink">
                      {ASSET_LABEL[cls]}
                    </span>
                    <span className="tnum text-[11px] text-ink-faint">
                      {rows.length}
                    </span>
                  </div>
                </td>
                <td className="hidden lg:table-cell" />
                <td />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="tnum px-3 py-2 text-right text-[12px] font-semibold text-ink">
                  {usd(value)}
                </td>
                <td
                  className={`tnum px-3 py-2 text-right text-[12px] font-semibold ${
                    !hasPnl ? "text-ink-faint" : pnl >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {hasPnl ? usd(pnl, { sign: true }) : "—"}
                </td>
                <td className="tnum px-4 py-2 text-right text-[12px] font-semibold text-ink-soft">
                  {totalValue > 0 ? `${((value / totalValue) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>

              {rows.map((h) => {
                const weight =
                  totalValue > 0 ? ((h.marketValue ?? 0) / totalValue) * 100 : 0;
                return (
                  <tr
                    key={h.id}
                    className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2/70"
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-[13.5px] font-semibold leading-tight text-ink">
                        {h.assetClass === "option" && h.strike != null
                          ? `${h.symbol} $${h.strike}`
                          : h.symbol}
                      </div>
                      <div className="truncate text-[11px] leading-tight text-ink-soft">
                        {subtitle(h)}
                      </div>
                    </td>

                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {h.institutionName && (
                        <span className="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                          {h.institutionName}
                        </span>
                      )}
                      <div className="truncate text-[10.5px] leading-tight text-ink-faint">
                        {h.accountName}
                      </div>
                    </td>

                    <td className="tnum px-3 py-2.5 text-right text-[12.5px] text-ink">
                      {qty(h.quantity)}
                    </td>
                    <td className="tnum hidden px-3 py-2.5 text-right text-[12.5px] text-ink-soft md:table-cell">
                      {price(h.averageCost)}
                    </td>
                    <td className="tnum hidden px-3 py-2.5 text-right text-[12.5px] text-ink-soft md:table-cell">
                      {price(h.lastPrice)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-[13px] font-semibold text-ink">
                      {h.marketValue != null ? usd(h.marketValue) : "—"}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      {h.unrealizedPnl == null ? (
                        <span className="text-[12.5px] text-ink-faint">—</span>
                      ) : (
                        <>
                          <div
                            className={`tnum text-[12.5px] font-semibold ${
                              h.unrealizedPnl >= 0 ? "text-pos" : "text-neg"
                            }`}
                          >
                            {usd(h.unrealizedPnl, { sign: true })}
                          </div>
                          {h.unrealizedPct != null && (
                            <div
                              className={`tnum text-[10.5px] leading-tight ${
                                h.unrealizedPnl >= 0 ? "text-pos/70" : "text-neg/70"
                              }`}
                            >
                              {h.unrealizedPct >= 0 ? "+" : ""}
                              {h.unrealizedPct.toFixed(1)}%
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Weight reads faster as a bar than as another number. */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-2 sm:block">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.min(100, weight)}%`,
                              background: ASSET_COLOR[h.assetClass],
                            }}
                          />
                        </span>
                        <span className="tnum w-10 text-right text-[12px] font-medium text-ink-soft">
                          {weight >= 0.05 ? `${weight.toFixed(1)}%` : "<0.1%"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
