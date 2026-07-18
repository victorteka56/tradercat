"use client";

import { useEffect, useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { fetchReview } from "@/app/(app)/journal/[id]/review-actions";
import type { TradeReview } from "@/lib/ai/trade-review";

/**
 * Shows the trade review, always. The computed floor renders instantly; if a
 * cached AI review exists it shows that; otherwise it upgrades the floor to the
 * AI version in the background — no button, no spinner blocking the content, and
 * never an error state (a failed upgrade just keeps the solid computed review).
 */
export function TradeReviewPanel({
  tradeId,
  initial,
  initialKind,
}: {
  tradeId: string;
  initial: TradeReview;
  initialKind: "ai" | "computed";
}) {
  const [review, setReview] = useState<TradeReview>(initial);
  const [, setKind] = useState<"ai" | "computed">(initialKind);
  const [upgrading, setUpgrading] = useState(initialKind === "computed");
  const started = useRef(false);

  useEffect(() => {
    // Only reach for the AI when showing the computed floor. Fire exactly once
    // and always apply the result: a cleanup-based "live" flag breaks under
    // StrictMode's double-invoke (run 1 fires + cleans up, run 2 is guarded, and
    // the response is discarded). A late setState after unmount is a harmless
    // no-op in React 18.
    if (initialKind !== "computed" || started.current) return;
    started.current = true;
    fetchReview(tradeId)
      .then((res) => {
        if ("needsData" in res) return;
        setReview(res.review);
        setKind(res.kind);
      })
      .catch(() => {
        /* keep the computed floor — never show an error */
      })
      .finally(() => setUpgrading(false));
  }, [tradeId, initialKind]);

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <StatusChip tone="info">Trade review</StatusChip>
        {upgrading && (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
            Refining…
          </span>
        )}
      </div>

      <p className="text-[14px] font-semibold leading-snug text-ink">
        {review.headline}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        {review.whatHappened}
      </p>

      {review.observations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {review.observations.map((o, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
              <span className="text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{o.label}.</span> {o.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      {review.toReview && (
        <div className="mt-3 rounded-xl border border-amber/20 bg-amber/5 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber">
            Worth noticing
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
            {review.toReview}
          </p>
        </div>
      )}

      <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-faint">
        Educational review of your own trade — not financial advice. Numbers are
        computed from market data; the wording explains them.
      </p>
    </SurfaceCard>
  );
}
