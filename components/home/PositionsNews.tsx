"use client";

import { useEffect, useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { fetchPositionsNews } from "@/app/(app)/home/news-actions";
import type { PositionArticle, Sentiment } from "@/lib/news";

/**
 * "News on your positions" — the latest headlines across the user's open
 * tickers, newest first, each with Polygon's per-ticker sentiment. Renders the
 * cached feed instantly; if it's stale/empty it warms the shared cache once in
 * the background (never blocks the page).
 */

const ago = (iso: string): string => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const SENT: Record<Sentiment, { label: string; cls: string }> = {
  positive: { label: "Bullish", cls: "bg-pos/10 text-pos" },
  negative: { label: "Bearish", cls: "bg-neg/10 text-neg" },
  neutral: { label: "Neutral", cls: "bg-surface-2 text-ink-soft" },
};

export function PositionsNews({
  initial,
  symbols,
  stale,
}: {
  initial: PositionArticle[];
  symbols: string[];
  stale: boolean;
}) {
  const [articles, setArticles] = useState<PositionArticle[]>(initial);
  const [loading, setLoading] = useState(symbols.length > 0 && (stale || initial.length === 0));
  const started = useRef(false);

  useEffect(() => {
    if (started.current || symbols.length === 0) return;
    if (!stale && initial.length > 0) return; // cache is fresh — no upstream call
    started.current = true;
    fetchPositionsNews()
      .then((r) => setArticles(r.articles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stale, initial.length, symbols.length]);

  if (symbols.length === 0) return null; // nothing open to watch

  return (
    <SurfaceCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">News on your positions</span>
          <span className="text-[11px] text-ink-faint">
            {symbols.length} watched
          </span>
        </div>
        {loading && (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
            Updating…
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          {loading
            ? "Fetching the latest headlines for your open positions…"
            : "No recent news for your open positions right now."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {articles.map((a, i) => {
            const s = a.sentiment ? SENT[a.sentiment] : null;
            return (
              <li key={`${a.url}-${i}`}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 py-2.5"
                >
                  <span className="tnum mt-0.5 shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold text-ink-soft">
                    {a.symbol}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13px] font-medium leading-snug text-ink transition-colors group-hover:text-info">
                      {a.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-faint">
                      <span className="truncate">{a.source}</span>
                      <span>·</span>
                      <span className="shrink-0">{ago(a.publishedAt)}</span>
                      {s && (
                        <span
                          className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${s.cls}`}
                        >
                          {s.label}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2.5 border-t border-line pt-2 text-[10px] leading-relaxed text-ink-faint">
        Headlines &amp; sentiment via Polygon — cached per ticker and shared across
        the app, so it stays fast as your positions grow.
      </p>
    </SurfaceCard>
  );
}
