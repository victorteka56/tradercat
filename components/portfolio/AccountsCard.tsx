import { usd } from "@/lib/format";
import type { AccountView } from "@/lib/queries/brokerage";

/**
 * Where the money actually sits, per connected account.
 *
 * The totals above are a blend of several brokerages; this is the only place
 * that answers "how much is in Webull vs Robinhood, and how much of it is
 * spendable" — the question that surfaces the moment a headline number looks
 * unfamiliar.
 */
export function AccountsCard({ accounts }: { accounts: AccountView[] }) {
  const total = accounts.reduce((s, a) => s + a.value, 0);

  return (
    <div className="divide-y divide-line">
      {accounts.map((a) => {
        const share = total > 0 ? (a.value / total) * 100 : 0;
        return (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink">
                {a.institutionName ?? "Brokerage"}
              </div>
              <div className="truncate text-[11px] text-ink-soft">
                {a.name}
                {a.positions > 0 && (
                  <span className="text-ink-faint">
                    {" · "}
                    {a.positions} position{a.positions === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="tnum text-[13px] font-semibold text-ink">
                {usd(a.value)}
              </div>
              <div className="tnum text-[10.5px] text-ink-faint">
                {a.cash == null ? "cash n/a" : `${usd(a.cash)} cash`}
              </div>
            </div>

            <div className="tnum w-11 shrink-0 text-right text-[11.5px] font-medium text-ink-soft">
              {share.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
