import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Analytics } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";

/**
 * The behavioural read-out — but as distinct little graphics, not a stack of
 * look-alike text cards. Each finding gets the visual that fits it: a
 * reward:risk balance, a hold-time comparison, tilt gauges, a concentration
 * meter. Only cards with real data render.
 */

const fmtDays = (d: number) => (d < 1 ? "<1d" : d < 10 ? `${d.toFixed(1)}d` : `${Math.round(d)}d`);
const usd0 = (n: number) =>
  `${n < 0 ? "-" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** Glossy fill for the mini-chart bars — a top highlight over the tone colour
 *  plus a soft shadow, so they read premium rather than flat. */
const glossy = (v: "pos" | "neg" | "info"): React.CSSProperties => ({
  background: `linear-gradient(180deg, rgba(255,255,255,0.30), rgba(255,255,255,0) 62%), var(--${v})`,
  boxShadow: "0 1px 3px rgba(20,24,31,0.16)",
});

/**
 * Behavioural findings as standalone cards. Returned as a plain array so the
 * page can pack them into the same mosaic as the breakdown charts — a separate
 * grid of its own would strand a shorter card and leave a gap beside it.
 */
export function keyFindingsCards(a: Analytics): React.ReactNode[] {
  const m = a.behaviorMetrics;
  const cards: React.ReactNode[] = [];

  // 1 — Reward vs risk: two bars + the payoff ratio.
  if (a.summary.winners > 0 && a.summary.losers > 0) {
    const max = Math.max(m.avgWin, Math.abs(m.avgLoss)) || 1;
    const ratioBad = (m.payoffRatio ?? 0) < 1;
    cards.push(
      <Card
        key="rr"
        eyebrow="Reward vs risk"
        title={ratioBad ? "Losers dwarf your winners" : "Winners outsize losers"}
      >
        <div className="space-y-2">
          <CompareBar label="Avg win" value={usd(m.avgWin, { sign: true })} pct={(m.avgWin / max) * 100} tone="pos" />
          <CompareBar label="Avg loss" value={usd(m.avgLoss, { sign: true })} pct={(Math.abs(m.avgLoss) / max) * 100} tone="neg" />
        </div>
        <div className="mt-3 flex items-baseline gap-1.5 border-t border-line pt-2.5">
          <span className={`tnum text-[20px] font-bold leading-none ${ratioBad ? "text-neg" : "text-pos"}`}>
            {m.payoffRatio != null ? `${m.payoffRatio.toFixed(2)}×` : "—"}
          </span>
          <span className="text-[11px] text-ink-faint">payoff ratio (avg win ÷ avg loss)</span>
        </div>
      </Card>,
    );
  }

  // 2 — Hold time: two mini columns, winners vs losers.
  if (m.avgHoldWinDays != null && m.avgHoldLossDays != null && (m.avgHoldWinDays > 0.02 || m.avgHoldLossDays > 0.02)) {
    const max = Math.max(m.avgHoldWinDays, m.avgHoldLossDays) || 1;
    const rideLosers = m.avgHoldLossDays > m.avgHoldWinDays;
    cards.push(
      <Card
        key="hold"
        eyebrow="Holding time"
        title={rideLosers ? "You ride losers longer" : "You let winners run"}
      >
        <div className="flex items-end justify-center gap-12" style={{ height: 82 }}>
          <MiniColumn label="Winners" days={m.avgHoldWinDays} pct={(m.avgHoldWinDays / max) * 100} tone="pos" />
          <MiniColumn label="Losers" days={m.avgHoldLossDays} pct={(m.avgHoldLossDays / max) * 100} tone="neg" />
        </div>
        <p className="mt-2 text-center text-[11.5px] leading-relaxed text-ink-soft">
          {rideLosers
            ? "The losers get more rope — cut winners short, ride losers."
            : "You give good trades room and cut the bad ones quickly."}
        </p>
      </Card>,
    );
  }

  // 3 — After a loss: two gauge rings.
  if (m.afterLoss && m.afterWin && m.afterLoss.count >= 10 && m.afterWin.count >= 10) {
    const tilt = m.afterLoss.winRate + 7 < m.afterWin.winRate;
    cards.push(
      <Card
        key="tilt"
        eyebrow="After a loss"
        title={tilt ? "Losses seem to tilt you" : "Steady after a loss"}
      >
        <div className="mt-1 flex items-center justify-around">
          <Ring pct={m.afterWin.winRate} label="after a win" tone="pos" />
          <Ring pct={m.afterLoss.winRate} label="after a loss" tone={tilt ? "neg" : "info"} />
        </div>
      </Card>,
    );
  }

  // 4 — Concentration meter.
  const conc =
    m.topProfitShare != null && a.summary.winners >= 8 && m.topProfitShare >= 45
      ? { pct: m.topProfitShare, tone: "info" as const, label: "of all gains come from your top 5 winners", title: "Profit is concentrated" }
      : m.worstLossShare != null && a.summary.losers >= 8 && m.worstLossShare >= 45
        ? { pct: m.worstLossShare, tone: "neg" as const, label: "of all losses come from your 5 worst trades", title: "A few trades did the damage" }
        : null;
  if (conc) {
    cards.push(
      <Card key="conc" eyebrow="Concentration" title={conc.title}>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`tnum text-[26px] font-bold leading-none ${conc.tone === "neg" ? "text-neg" : "text-info"}`}>
            {Math.round(conc.pct)}%
          </span>
          <span className="text-[11.5px] text-ink-soft">{conc.label}</span>
        </div>
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ ...glossy(conc.tone === "neg" ? "neg" : "info"), width: `${Math.min(100, conc.pct)}%` }}
          />
        </div>
      </Card>,
    );
  }

  return cards;
}

function Card({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="p-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{eyebrow}</div>
      <div className="mb-3 mt-0.5 text-[14px] font-semibold text-ink">{title}</div>
      {children}
    </SurfaceCard>
  );
}

function CompareBar({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "pos" | "neg";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-ink-soft">{label}</span>
        <span className={`tnum text-[12px] font-semibold ${tone === "pos" ? "text-pos" : "text-neg"}`}>{value}</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ ...glossy(tone), width: `${Math.max(4, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function MiniColumn({
  label,
  days,
  pct,
  tone,
}: {
  label: string;
  days: number;
  pct: number;
  tone: "pos" | "neg";
}) {
  return (
    <div className="flex h-full flex-col items-center justify-end">
      <span className="tnum mb-1 text-[12px] font-semibold text-ink">{fmtDays(days)}</span>
      <div
        className="w-8 rounded-t-md"
        style={{ ...glossy(tone), height: `${Math.max(6, (pct / 100) * 54)}px` }}
      />
      <span className="mt-1 text-[10px] font-semibold text-ink-faint">{label}</span>
    </div>
  );
}

function Ring({ pct, label, tone }: { pct: number; label: string; tone: "pos" | "neg" | "info" }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const stroke = tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : "var(--info)";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[60px] w-[60px]">
        <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            style={{ filter: "drop-shadow(0 1px 2px rgba(20,24,31,0.18))" }}
          />
        </svg>
        <div className="tnum absolute inset-0 flex items-center justify-center text-[14px] font-bold text-ink">
          {pct}%
        </div>
      </div>
      <span className="mt-1 text-[10.5px] font-semibold text-ink-faint">{label}</span>
    </div>
  );
}
