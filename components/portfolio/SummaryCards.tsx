import type { LucideIcon } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

/**
 * The portfolio's two summary surfaces.
 *
 * Both read as quiet tables — a muted label on the left, the figure right-
 * aligned on the same line — rather than as blocks of stacked type. Rows that
 * share a baseline are far easier to compare down a column, and it keeps the
 * cards short enough that the sections beneath them stay on screen.
 *
 * Colour is used sparingly: a small icon carries it, and green/red is reserved
 * for figures where the sign is the meaning.
 */

export interface StatRow {
  label: string;
  value: string;
  /** Optional second line under the value — context, never a number. */
  sub?: string;
  icon: LucideIcon;
  color: string;
  tone?: "pos" | "neg";
}

function Row({ row, last }: { row: StatRow; last?: boolean }) {
  const { icon: Icon, color, tone } = row;
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${last ? "" : "border-b border-line/70"}`}
    >
      <Icon size={15} strokeWidth={2} style={{ color }} className="shrink-0" />
      <span className="flex-1 truncate text-[12.5px] text-ink-soft">{row.label}</span>
      <span className="min-w-0 text-right">
        <span
          className={`tnum block truncate text-[13.5px] font-semibold ${
            tone === "neg" ? "text-neg" : tone === "pos" ? "text-pos" : "text-ink"
          }`}
        >
          {row.value}
        </span>
        {row.sub && (
          <span className="block truncate text-[10.5px] leading-tight text-ink-faint">
            {row.sub}
          </span>
        )}
      </span>
    </div>
  );
}

/** Total value now, with the figures that compose it. */
export function ValueCard({
  totalValue,
  changeLabel,
  up,
  stats,
}: {
  totalValue: string;
  changeLabel: string;
  up: boolean;
  stats: StatRow[];
}) {
  return (
    <SurfaceCard className="p-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        Total value
      </div>
      <div className="tnum mt-1 text-[27px] font-semibold leading-none tracking-tight text-ink">
        {totalValue}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
            up ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"
          }`}
        >
          {up ? "▲" : "▼"} {changeLabel}
        </span>
        <span className="text-[11px] text-ink-soft">open P/L</span>
      </div>

      <div className="mt-3 border-t border-line pt-1">
        {stats.map((s, i) => (
          <Row key={s.label} row={s} last={i === stats.length - 1} />
        ))}
      </div>
    </SurfaceCard>
  );
}

/** The facts worth acting on, as the same quiet table. */
export function SignalsCard({ signals }: { signals: StatRow[] }) {
  if (signals.length === 0) return null;
  return (
    <SurfaceCard className="px-5 py-3.5">
      {signals.map((s, i) => (
        <Row key={s.label} row={s} last={i === signals.length - 1} />
      ))}
    </SurfaceCard>
  );
}
