"use client";

import { useEffect, useRef, useState } from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { fetchReview } from "@/app/(app)/journal/[id]/review-actions";
import type { TradeReview } from "@/lib/ai/trade-review";
import { usd } from "@/lib/format";

/**
 * The trade's AI analysis, as a Meta-Ads-style panel that slides in from the
 * right. A compact launcher sits inline on the detail page; opening it reveals
 * the full read — a tone-coloured verdict hero, scannable metric tiles, a short
 * summary, observation cards and a takeaway. Structured, not a wall of text.
 *
 * The computed floor renders instantly; if no AI narrative is cached it upgrades
 * in the background (a quiet "Refining…" pulse), never blocking and never
 * erroring — a failed upgrade just keeps the solid computed version.
 */

export interface RunSummary {
  peak: number;
  trough: number;
  maxDrawdown: number;
  giveback: number;
  timeUnderwaterPct: number;
  estimated: boolean;
}

export interface ExcSummary {
  favorable: number;
  adverse: number;
  captured: number | null;
  netMove: number;
  directionCorrect: boolean;
}

export interface AnalysisTrade {
  symbol: string;
  netPnl: number;
  pnlPct: number | null;
  incomplete: boolean;
  held: string | null;
}

export function TradeAnalysisDrawer({
  tradeId,
  initial,
  initialKind,
  trade,
  run,
  exc,
}: {
  tradeId: string;
  initial: TradeReview;
  initialKind: "ai" | "computed";
  trade: AnalysisTrade;
  run: RunSummary | null;
  exc: ExcSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  const [review, setReview] = useState<TradeReview>(initial);
  const [upgrading, setUpgrading] = useState(initialKind === "computed");
  const started = useRef(false);

  // Upgrade the computed floor to the AI narrative once, in the background.
  useEffect(() => {
    if (initialKind !== "computed" || started.current) return;
    started.current = true;
    fetchReview(tradeId)
      .then((res) => {
        if ("needsData" in res) return;
        setReview(res.review);
      })
      .catch(() => {
        /* keep the computed floor — never show an error */
      })
      .finally(() => setUpgrading(false));
  }, [tradeId, initialKind]);

  // Enter/exit transition + Escape + scroll lock.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      setShown(false);
    };
  }, [open]);

  const v = verdict(trade.netPnl, trade.incomplete, run);
  const tiles = metricTiles(run, exc);

  return (
    <>
      {/* Inline launcher — a futuristic, glowing teaser that opens the panel */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tc-ai-card group relative mb-4 flex w-full items-center gap-3.5 overflow-hidden rounded-2xl p-4 text-left"
      >
        {/* Base violet gradient */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(125deg, #1a1140 0%, #271759 45%, #3a1d78 100%)" }}
        />
        {/* Breathing glow blobs */}
        <span
          aria-hidden
          className="tc-ai-glow pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.55), transparent 68%)" }}
        />
        <span
          aria-hidden
          className="tc-ai-glow pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.5), transparent 68%)",
            animationDelay: "1.3s",
          }}
        />
        {/* Sweeping sheen */}
        <span
          aria-hidden
          className="tc-ai-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4"
          style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.16), transparent)" }}
        />
        {/* Inner hairline ring */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 1px rgba(196,181,253,0.25)" }}
        />

        {/* Glowing AI orb */}
        <span
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{
            background: "linear-gradient(150deg, #a78bfa, #7c3aed)",
            boxShadow: "0 0 18px rgba(167,139,250,0.65)",
          }}
        >
          <SparkIcon />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white">AI trade analysis</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${glowChip(v.tone)}`}>
              {v.label}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[#e9e3ff]/75">
            {review.headline}
          </span>
        </span>

        <span className="relative flex items-center gap-1 text-[12px] font-semibold text-white/90">
          View
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Trade analysis">
          <button
            aria-label="Close analysis"
            onClick={() => setOpen(false)}
            className={`absolute inset-0 bg-ink/40 backdrop-blur-[1px] transition-opacity duration-300 ${
              shown ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-bg shadow-card-hover transition-transform duration-300 ease-out ${
              shown ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header — the futuristic accent carries over from the launcher */}
            <div
              className="relative flex items-center justify-between overflow-hidden px-5 py-3.5"
              style={{ background: "linear-gradient(120deg, #1a1140 0%, #2a1a63 100%)" }}
            >
              <span
                aria-hidden
                className="tc-ai-glow pointer-events-none absolute -left-8 -top-12 h-28 w-28 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(167,139,250,0.5), transparent 70%)" }}
              />
              <div className="relative flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{
                    background: "linear-gradient(150deg, #a78bfa, #7c3aed)",
                    boxShadow: "0 0 16px rgba(167,139,250,0.6)",
                  }}
                >
                  <SparkIcon small />
                </span>
                <div>
                  <div className="text-[14px] font-semibold leading-none text-white">
                    Trade analysis
                  </div>
                  <div className="mt-1 text-[11px] leading-none text-[#c4b5fd]">
                    {trade.symbol} · AI review
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                {upgrading && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#c4b5fd]">
                    <span className="flex items-end gap-[3px]">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="tc-dot h-1 w-1 rounded-full"
                          style={{ animationDelay: `${i * 0.15}s`, background: "#c4b5fd" }}
                        />
                      ))}
                    </span>
                    Refining…
                  </span>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Verdict hero */}
              <div className={`overflow-hidden rounded-2xl border ${accent(v.tone)}`}>
                <div className={`h-1 w-full ${bar(v.tone)}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${chipTone(v.tone)}`}>
                        {v.label}
                      </span>
                      <p className="mt-2 text-[16px] font-semibold leading-snug text-ink">
                        {review.headline}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`tnum text-[20px] font-bold leading-none ${trade.netPnl >= 0 ? "text-pos" : "text-neg"}`}>
                        {trade.incomplete ? "—" : usd(trade.netPnl, { sign: true })}
                      </div>
                      <div className="tnum mt-1 text-[11px] text-ink-faint">
                        {trade.pnlPct == null ? "realized" : `${trade.pnlPct >= 0 ? "+" : ""}${trade.pnlPct.toFixed(1)}%`}
                        {trade.held ? ` · ${trade.held}` : ""}
                      </div>
                    </div>
                  </div>
                  {v.nuance && (
                    <p className="tnum mt-2.5 border-t border-line/70 pt-2.5 text-[12px] font-medium text-ink-soft">
                      {v.nuance}
                    </p>
                  )}
                </div>
              </div>

              {/* Metric tiles */}
              {tiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {tiles.map((t) => (
                    <div key={t.label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t.label}
                      </div>
                      <div className={`tnum mt-0.5 text-[15px] font-semibold ${toneText(t.tone)}`}>
                        {t.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <Section title="What happened">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  {review.whatHappened}
                </p>
              </Section>

              {/* Observations */}
              {review.observations.length > 0 && (
                <Section title="What stood out">
                  <div className="space-y-2">
                    {review.observations.map((o, i) => (
                      <div key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-info/10 text-[11px] font-bold text-info">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-ink">{o.label}</div>
                          <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{o.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Takeaway */}
              {review.toReview && (
                <div className="rounded-2xl border border-amber/25 bg-amber/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <FlagIcon />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-amber">
                      Take into the next trade
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                    {review.toReview}
                  </p>
                </div>
              )}

              <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
                Educational review of your own trade — not financial advice. Numbers are
                computed from market data; the wording explains them.
                {run?.estimated ? " Option P/L is estimated from the underlying." : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Sections & icons ---- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
        {title}
      </div>
      {children}
    </div>
  );
}

function SparkIcon({ small }: { small?: boolean }) {
  const s = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg viewBox="0 0 24 24" className={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15V4h13l-2 4 2 4H4M4 21v-6" />
    </svg>
  );
}

/* ---- Metric tiles ---- */

type Tone = "pos" | "neg" | "amber" | "neutral";

function metricTiles(
  run: RunSummary | null,
  exc: ExcSummary | null,
): { label: string; value: string; tone: Tone }[] {
  const tiles: { label: string; value: string; tone: Tone }[] = [];
  if (run) {
    tiles.push({ label: "Peak P/L", value: usd(run.peak, { sign: true }), tone: run.peak >= 0 ? "pos" : "neg" });
    tiles.push({ label: "Max drawdown", value: run.maxDrawdown > 0.5 ? `-${usd(run.maxDrawdown)}` : "—", tone: run.maxDrawdown > 0.5 ? "neg" : "neutral" });
    tiles.push({ label: "Given back", value: run.giveback > 0.5 ? `-${usd(run.giveback)}` : "—", tone: run.giveback > 0.5 ? "amber" : "neutral" });
    tiles.push({ label: "Time in the red", value: `${run.timeUnderwaterPct}%`, tone: "neutral" });
  } else if (exc) {
    tiles.push({ label: "Best in favour", value: `+${exc.favorable}%`, tone: "pos" });
    tiles.push({ label: "Worst against", value: `-${exc.adverse}%`, tone: "neg" });
    if (exc.captured != null) tiles.push({ label: "Move captured", value: `${exc.captured}%`, tone: "neutral" });
    tiles.push({ label: "Net move", value: `${exc.netMove >= 0 ? "+" : ""}${exc.netMove}%`, tone: exc.netMove >= 0 ? "pos" : "neg" });
  }
  return tiles;
}

/* ---- Tone helpers ---- */

function chipTone(tone: Tone): string {
  switch (tone) {
    case "pos":
      return "bg-pos/10 text-pos";
    case "neg":
      return "bg-neg/10 text-neg";
    case "amber":
      return "bg-amber/10 text-amber";
    default:
      return "bg-surface-2 text-ink-soft";
  }
}

/** Verdict chip tuned for legibility on the dark violet launcher/header. */
function glowChip(tone: Tone): string {
  switch (tone) {
    case "pos":
      return "bg-[#22c55e]/20 text-[#86efac]";
    case "neg":
      return "bg-[#f87171]/20 text-[#fca5a5]";
    case "amber":
      return "bg-[#f59e0b]/20 text-[#fcd34d]";
    default:
      return "bg-white/15 text-[#e9e3ff]";
  }
}

function toneText(tone: Tone): string {
  switch (tone) {
    case "pos":
      return "text-pos";
    case "neg":
      return "text-neg";
    case "amber":
      return "text-amber";
    default:
      return "text-ink";
  }
}

function accent(tone: Tone): string {
  switch (tone) {
    case "pos":
      return "border-pos/20";
    case "neg":
      return "border-neg/20";
    case "amber":
      return "border-amber/25";
    default:
      return "border-line";
  }
}

function bar(tone: Tone): string {
  switch (tone) {
    case "pos":
      return "bg-pos";
    case "neg":
      return "bg-neg";
    case "amber":
      return "bg-amber";
    default:
      return "bg-line";
  }
}

/* ---- Derived verdict (data-only, non-judgmental) ---- */

function verdict(
  netPnl: number,
  incomplete: boolean,
  run: RunSummary | null,
): { label: string; tone: Tone; nuance: string | null } {
  if (incomplete) return { label: "Partial", tone: "neutral", nuance: null };

  const win = netPnl >= 0;
  let nuance: string | null = null;

  if (run) {
    const { peak, giveback, trough } = run;
    if (win && peak > 0 && giveback > 0.5 && giveback / peak > 0.35) {
      return {
        label: "Won, gave back",
        tone: "amber",
        nuance: `Peaked at ${usd(peak, { sign: true })}, gave back ${usd(giveback)} before closing.`,
      };
    }
    if (!win && peak > Math.abs(netPnl) * 0.5) {
      return {
        label: "Round-tripped",
        tone: "neg",
        nuance: `Was up ${usd(peak, { sign: true })} at best before closing red.`,
      };
    }
    if (win && trough < 0) {
      nuance = `Sat through ${usd(trough)} underwater before it worked.`;
    }
  }

  return { label: win ? "Win" : "Loss", tone: win ? "pos" : "neg", nuance };
}
