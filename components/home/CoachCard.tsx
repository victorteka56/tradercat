"use client";

import { useEffect, useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { fetchCoachSummary } from "@/app/(app)/home/coach-actions";
import type { CoachSummary } from "@/lib/ai/coach";

/**
 * "Your trading coach" — the daily reason to open the app.
 *
 * Reads across the whole history (not one trade) and says, in plain language,
 * the two or three patterns that actually shape the trader's results. Renders
 * the computed floor instantly; if that's all we have, it warms the AI version
 * once in the background — the page never waits on it.
 */
export function CoachCard({
  initial,
  stale,
}: {
  initial: CoachSummary;
  stale: boolean;
}) {
  const [summary, setSummary] = useState(initial);
  const [loading, setLoading] = useState(stale);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !stale) return;
    started.current = true;
    fetchCoachSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stale]);

  return (
    <SurfaceCard className="tc-ai-card relative overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-white"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              boxShadow: "0 2px 8px -2px rgba(124,58,237,0.6)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8m-3.4 3.4-2.8 2.8m9-.1-2.8-2.8M9.3 9.3 6.5 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-ink">Your trading coach</span>
        </div>
        {loading ? (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
            Reading your history…
          </span>
        ) : (
          <span className="text-[10.5px] font-medium text-ink-faint">
            {summary.source === "ai" ? "AI · across all trades" : "across all trades"}
          </span>
        )}
      </div>

      <h2 className="text-[16px] font-semibold leading-snug tracking-tight text-ink">
        {summary.headline}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{summary.summary}</p>

      <div className="mt-3 space-y-2">
        {summary.observations.map((o, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-info/70" />
            <div>
              <span className="text-[12.5px] font-semibold text-ink">{o.label} — </span>
              <span className="text-[12.5px] leading-relaxed text-ink-soft">{o.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {summary.focus && (
        <div className="mt-3.5 rounded-xl border border-info/20 bg-info/5 px-3.5 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-info">
            Worth watching
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">{summary.focus}</p>
        </div>
      )}
    </SurfaceCard>
  );
}
