"use client";

import { useEffect, useState, useTransition } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  clearReviews,
  clearUploads,
  disconnectAll,
  getDevCounts,
  runPrecompute,
  type DevCounts,
} from "./dev-actions";

/**
 * Dev-only testing panel. Reset state and watch the connect → sync → precompute
 * loop. Polls counts every few seconds so precompute progress is visible.
 */
export function DevTools({
  userId,
  initial,
}: {
  userId: string;
  initial: DevCounts;
}) {
  const [counts, setCounts] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [polling, setPolling] = useState(false);

  // While precompute may be running in the background, poll so cached/reviewable
  // ticks up on screen.
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      const c = await getDevCounts(userId);
      setCounts(c);
      if (c.cachedReviews >= c.reviewableTrades) setPolling(false);
    }, 2500);
    return () => clearInterval(id);
  }, [polling, userId]);

  const refresh = async () => setCounts(await getDevCounts(userId));

  const act = (fn: () => Promise<unknown>, label: (r: unknown) => string) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(label(r));
      await refresh();
    });

  const covered =
    counts.reviewableTrades > 0
      ? Math.round((counts.cachedReviews / counts.reviewableTrades) * 100)
      : 100;

  return (
    <SurfaceCard className="mt-4 border-amber/30 bg-amber/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-amber">
          🧪 Testing tools
        </span>
        <button
          onClick={refresh}
          className="text-[11px] font-semibold text-ink-faint hover:text-ink"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
        <Count label="Connections" value={counts.connections} />
        <Count label="Synced trades" value={counts.syncedTrades} />
        <Count label="CSV trades" value={counts.csvTrades} />
        <Count label="Reviewable" value={counts.reviewableTrades} />
        <Count label="Reviews cached" value={counts.cachedReviews} />
        <Count label="Coverage" value={`${covered}%`} />
      </div>

      {counts.reviewableTrades > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-info transition-all"
            style={{ width: `${covered}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <DevButton
          disabled={pending}
          onClick={() =>
            act(runPrecompute, (r) => {
              setPolling(true);
              const x = r as { generated: number; considered: number };
              return `Precompute: generating ${x.considered} (in background)…`;
            })
          }
        >
          Precompute reviews now
        </DevButton>
        <DevButton
          disabled={pending}
          onClick={() =>
            act(clearReviews, (r) => `Cleared ${(r as { removed: number }).removed} reviews`)
          }
        >
          Clear reviews
        </DevButton>
        <DevButton
          danger
          disabled={pending}
          onClick={() =>
            act(disconnectAll, (r) => `Disconnected ${(r as { removed: number }).removed} brokerage(s)`)
          }
        >
          Disconnect all
        </DevButton>
        <DevButton
          danger
          disabled={pending}
          onClick={() => act(clearUploads, () => "Cleared CSV uploads")}
        >
          Clear uploads
        </DevButton>
      </div>

      {msg && <p className="mt-2 text-[12px] text-ink-soft">{msg}</p>}
    </SurfaceCard>
  );
}

function Count({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-surface px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="tnum text-[15px] font-semibold text-ink">{value}</div>
    </div>
  );
}

function DevButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 rounded-full border px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-neg/30 bg-surface text-neg hover:bg-neg/5"
          : "border-line bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
