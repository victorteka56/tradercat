import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { usd } from "@/lib/format";
import type { TagKind, TagPerformance } from "@/lib/queries/journal";

/**
 * Performance by tag — the payoff of tagging trades.
 *
 * Timing-based analytics can only ever infer behaviour; tags let the trader
 * assert it, so this is the one place that answers "does my breakout setup
 * actually make money" and "what do my mistakes cost me" directly. Grouped by
 * category, each with an expectancy bar, and topped by the single sharpest
 * read-out: the best setup and the most expensive mistake.
 */

const SECTIONS: { kind: TagKind; label: string; color: string; blurb: string }[] = [
  { kind: "setup", label: "Setups", color: "#3a5a9c", blurb: "which plays pay" },
  { kind: "mistake", label: "Mistakes", color: "#bd4640", blurb: "what they cost" },
  { kind: "emotion", label: "Emotions", color: "#a3741a", blurb: "state vs. result" },
];

const alpha = (hex: string, a: number) =>
  hex + Math.round(a * 255).toString(16).padStart(2, "0");

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  // Diverging from a centre line: gains right, losses left, scaled to the
  // widest magnitude in view so the biggest bar fills its half.
  const pct = max > 0 ? (Math.abs(value) / max) * 50 : 0;
  const pos = value >= 0;
  return (
    <div className="relative h-1.5 w-full rounded-full bg-surface-2">
      <div className="absolute left-1/2 top-0 h-full w-px bg-line" />
      <div
        className="absolute top-0 h-full rounded-full"
        style={{
          background: color,
          width: `${pct}%`,
          left: pos ? "50%" : `${50 - pct}%`,
        }}
      />
    </div>
  );
}

export function TagPerformanceCard({ tags }: { tags: TagPerformance[] }) {
  if (tags.length === 0) return null;

  const bestSetup = tags
    .filter((t) => t.kind === "setup")
    .sort((a, b) => b.expectancy - a.expectancy)[0];
  const worstMistake = tags
    .filter((t) => t.kind === "mistake")
    .sort((a, b) => a.netPnl - b.netPnl)[0];

  return (
    <SurfaceCard className="p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-ink">Performance by tag</h3>
        <span className="text-[11px] text-ink-faint">all-time</span>
      </div>
      <p className="mb-3 text-[11.5px] leading-relaxed text-ink-soft">
        Average result per trade.
      </p>

      {/* The one-line verdict. */}
      {(bestSetup || worstMistake) && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {bestSetup && (
            <div className="rounded-xl border border-line px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                Best setup
              </div>
              <div className="text-[13px] font-semibold text-ink">{bestSetup.name}</div>
              <div
                className={`tnum text-[12px] font-semibold ${
                  bestSetup.expectancy >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {usd(bestSetup.expectancy, { sign: true })}/trade · {bestSetup.winRate}% win
              </div>
            </div>
          )}
          {worstMistake && (
            <div className="rounded-xl border border-line px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                Costliest mistake
              </div>
              <div className="text-[13px] font-semibold text-ink">{worstMistake.name}</div>
              <div className="tnum text-[12px] font-semibold text-neg">
                {usd(worstMistake.netPnl, { sign: true })} over {worstMistake.trades} trade
                {worstMistake.trades === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>
      )}

      {SECTIONS.map((s) => {
        const rows = tags
          .filter((t) => t.kind === s.kind)
          .sort((a, b) => b.expectancy - a.expectancy);
        if (rows.length === 0) return null;
        const max = Math.max(...rows.map((r) => Math.abs(r.expectancy)), 1);

        return (
          <div key={s.kind} className="mb-3 last:mb-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-[3px]"
                style={{ background: s.color }}
              />
              <span className="text-[11.5px] font-semibold text-ink">{s.label}</span>
              <span className="text-[10.5px] text-ink-faint">{s.blurb}</span>
            </div>
            <div className="space-y-1.5">
              {rows.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="w-[34%] min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-ink">
                      {t.name}
                    </div>
                    <div className="tnum text-[10.5px] text-ink-faint">
                      {t.trades} trade{t.trades === 1 ? "" : "s"} · {t.winRate}% win
                    </div>
                  </div>
                  <div className="flex-1">
                    <Bar
                      value={t.expectancy}
                      max={max}
                      color={
                        t.expectancy >= 0
                          ? "var(--pos, #17915f)"
                          : "var(--neg, #bd4640)"
                      }
                    />
                  </div>
                  <div
                    className={`tnum w-[22%] text-right text-[12px] font-semibold ${
                      t.expectancy >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {usd(t.expectancy, { sign: true })}
                    <span className="ml-1 text-[9.5px] font-normal text-ink-faint">/trade</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </SurfaceCard>
  );
}
