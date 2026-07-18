import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Excursions } from "@/lib/analysis/excursions";

/**
 * The computed timing picture — always shown when we have candles, no LLM
 * involved. Labelled in plain language and honest that it describes the stock,
 * not the option itself.
 */
export function ExcursionCard({
  excursions,
  symbol,
}: {
  excursions: Excursions;
  symbol: string;
}) {
  const e = excursions;
  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-1 text-[13px] font-semibold text-ink">
        How {symbol} moved while you held
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink-faint">
        These describe {symbol}&apos;s share price, not the option&apos;s value.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Best in your favour"
          value={`+${e.favorableExcursionPct}%`}
          tone="pos"
          hint="how far the stock moved your way at its best"
        />
        <Stat
          label="Worst against you"
          value={`-${e.adverseExcursionPct}%`}
          tone="neg"
          hint="how far it went against you at its worst"
        />
      </div>

      {e.capturedPct != null && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] text-ink-soft">
              You captured of the favourable move
            </span>
            <span className="tnum text-[12px] font-semibold text-ink">
              {e.capturedPct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-info"
              style={{ width: `${Math.min(100, e.capturedPct)}%` }}
            />
          </div>
        </div>
      )}

      {e.entryPositionPct != null && (
        <p className="mt-3 border-t border-line pt-2.5 text-[12px] leading-relaxed text-ink-soft">
          You entered when {symbol} was near the{" "}
          <span className="font-semibold text-ink">
            {e.entryPositionPct <= 33
              ? "low"
              : e.entryPositionPct >= 67
              ? "high"
              : "middle"}
          </span>{" "}
          of its range during your hold.
        </p>
      )}
    </SurfaceCard>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
  hint: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div
        className={`tnum mt-0.5 text-[18px] font-semibold ${
          tone === "pos" ? "text-pos" : "text-neg"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] leading-tight text-ink-faint">{hint}</div>
    </div>
  );
}
