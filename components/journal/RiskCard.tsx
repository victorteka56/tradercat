"use client";

import { useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { setTradeRisk, clearTradeRisk } from "@/app/(app)/journal/[id]/risk-actions";
import { usd } from "@/lib/format";

/**
 * Score a trade in R — result as a multiple of what was risked.
 *
 * The trader supplies the one thing we can't reconstruct: the stop they'd have
 * bailed at. From that and the known entry/size/P/L we derive risk and R, and
 * show it live as they type so the number is never a mystery. R is what makes a
 * +$300 scalp and a +$3,000 swing comparable, and it unlocks the R-based
 * expectancy on the analytics page.
 */

const OPTION_MULTIPLIER = 100;

export function RiskCard({
  tradeId,
  kind,
  avgEntryPrice,
  openedQty,
  netPnl,
  initialStopHint,
  savedRiskPerUnit,
  savedRMultiple,
  hasRisk,
}: {
  tradeId: string;
  kind: "option" | "stock" | "other";
  avgEntryPrice: number | null;
  openedQty: number;
  netPnl: number;
  /** A sensible starting value for the input (the saved stop, if any). */
  initialStopHint: string;
  savedRiskPerUnit: number | null;
  savedRMultiple: number | null;
  hasRisk: boolean;
}) {
  const [editing, setEditing] = useState(!hasRisk);
  const [stop, setStop] = useState(initialStopHint);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState({ hasRisk, savedRiskPerUnit, savedRMultiple });

  const mult = kind === "option" ? OPTION_MULTIPLIER : 1;
  const stopNum = Number(stop);

  // Live preview mirrors the server math exactly.
  const preview =
    avgEntryPrice != null && stop !== "" && Number.isFinite(stopNum)
      ? (() => {
          const riskPerUnit = Math.abs(avgEntryPrice - stopNum);
          const totalRisk = riskPerUnit * openedQty * mult;
          const r = totalRisk > 0 ? netPnl / totalRisk : null;
          return { riskPerUnit, totalRisk, r };
        })()
      : null;

  const canScore = avgEntryPrice != null && openedQty > 0;

  const save = async () => {
    if (!preview || preview.totalRisk <= 0) {
      setError("Stop must differ from the entry price.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await setTradeRisk(tradeId, stopNum);
      setSaved({ hasRisk: true, savedRiskPerUnit: res.riskPerUnit, savedRMultiple: res.rMultiple });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await clearTradeRisk(tradeId);
      setSaved({ hasRisk: false, savedRiskPerUnit: null, savedRMultiple: null });
      setStop("");
      setEditing(true);
    } finally {
      setBusy(false);
    }
  };

  const rTone = (r: number | null) =>
    r == null ? "text-ink" : r >= 0 ? "text-pos" : "text-neg";

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          Risk &amp; R-multiple
        </span>
        {saved.hasRisk && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[11.5px] font-semibold text-info"
          >
            Edit
          </button>
        )}
      </div>

      {!canScore ? (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          This trade is missing the entry price needed to score risk.
        </p>
      ) : saved.hasRisk && !editing ? (
        // Saved state — the R stat, prominent.
        <div className="flex items-end justify-between">
          <div>
            <div className={`tnum text-[26px] font-semibold leading-none ${rTone(saved.savedRMultiple)}`}>
              {saved.savedRMultiple != null
                ? `${saved.savedRMultiple > 0 ? "+" : ""}${saved.savedRMultiple.toFixed(2)}R`
                : "—"}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-soft">
              Risked {usd((saved.savedRiskPerUnit ?? 0) * openedQty * mult)} · stop-based
            </div>
          </div>
          <button
            onClick={clear}
            disabled={busy}
            className="text-[11.5px] font-medium text-ink-faint hover:text-neg disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      ) : (
        // Editing — enter a stop, preview R live.
        <>
          <p className="mb-2.5 text-[12px] leading-relaxed text-ink-soft">
            Where would you have bailed?
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-faint">
                $
              </span>
              <input
                value={stop}
                onChange={(e) => setStop(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="stop price"
                className="w-full rounded-lg border border-line bg-surface py-1.5 pl-6 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-ink/25"
              />
            </div>
            <button
              onClick={save}
              disabled={busy || !preview}
              className="rounded-lg bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:bg-ink/90 disabled:opacity-40"
            >
              Score
            </button>
          </div>

          {preview && preview.totalRisk > 0 && (
            <div className="mt-2.5 flex items-center gap-4 border-t border-line pt-2.5">
              <Preview label="Risk / unit" value={usd(preview.riskPerUnit)} />
              <Preview label="Total risk" value={usd(preview.totalRisk)} />
              <Preview
                label="R-multiple"
                value={
                  preview.r != null
                    ? `${preview.r > 0 ? "+" : ""}${preview.r.toFixed(2)}R`
                    : "—"
                }
                tone={rTone(preview.r)}
              />
            </div>
          )}
          {error && <p className="mt-2 text-[11.5px] text-neg">{error}</p>}
        </>
      )}
    </SurfaceCard>
  );
}

function Preview({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        {label}
      </div>
      <div className={`tnum text-[14px] font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
