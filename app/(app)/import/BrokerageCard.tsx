"use client";

import { useFormStatus } from "react-dom";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { connectBrokerage, removeBrokerage, syncBrokerage } from "./brokerage-actions";
import { usd } from "@/lib/format";

export interface ConnectionView {
  id: string;
  institutionName: string | null;
  status: "active" | "disabled" | "error";
  lastSuccessfulSyncAt: Date | null;
  accounts: {
    id: string;
    name: string | null;
    number: string | null;
    balance: number | null;
    currency: string | null;
    /** null while the broker is still backfilling trade history. */
    transactionsSynced: Date | null;
  }[];
}

function Pending({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? busy : idle}</>;
}

function SubmitPill({
  idle,
  busy,
  variant = "primary",
}: {
  idle: string;
  busy: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink/90 border-transparent"
      : variant === "danger"
      ? "border-line bg-surface text-neg hover:bg-neg/5"
      : "border-line bg-surface text-ink hover:bg-surface-2";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 ${styles}`}
    >
      <Pending idle={idle} busy={busy} />
    </button>
  );
}

export function BrokerageCard({ connections }: { connections: ConnectionView[] }) {
  if (connections.length === 0) {
    return (
      <SurfaceCard className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">
            Connect a brokerage
          </span>
          <StatusChip tone="info">Live</StatusChip>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Sync holdings and trade history automatically. You sign in with your
          broker directly — TraderCat never sees your credentials, and access is
          read-only.
        </p>
        <form action={connectBrokerage} className="mt-3">
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink/90"
          >
            Connect brokerage
          </button>
        </form>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((c) => (
        <SurfaceCard key={c.id} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-[14px] font-semibold text-ink">
                {c.institutionName ?? "Brokerage"}
              </div>
              <div className="tnum text-[11px] text-ink-faint">
                {c.lastSuccessfulSyncAt
                  ? `Synced ${new Date(c.lastSuccessfulSyncAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Not synced yet"}
              </div>
            </div>
            <StatusChip
              tone={
                c.status === "active" ? "pos" : c.status === "error" ? "neg" : "amber"
              }
            >
              {c.status}
            </StatusChip>
          </div>

          <div className="divide-y divide-line">
            {c.accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">
                    {a.name ?? "Account"}
                  </div>
                  <div className="tnum text-[11px] text-ink-faint">
                    {a.number ? `#${a.number}` : ""}
                  </div>
                </div>
                {/* Be explicit while history is still backfilling. */}
                {!a.transactionsSynced && (
                  <StatusChip tone="amber">History syncing</StatusChip>
                )}
                <div className="tnum text-right text-[13px] font-semibold text-ink">
                  {a.balance != null ? usd(a.balance) : "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-line px-4 py-3">
            <form action={syncBrokerage}>
              <SubmitPill idle="Sync now" busy="Syncing…" variant="secondary" />
            </form>
            <form action={connectBrokerage}>
              <SubmitPill idle="Add another" busy="Opening…" variant="secondary" />
            </form>
            <form action={removeBrokerage} className="ml-auto">
              <input type="hidden" name="connectionId" value={c.id} />
              <SubmitPill idle="Disconnect" busy="Removing…" variant="danger" />
            </form>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}
