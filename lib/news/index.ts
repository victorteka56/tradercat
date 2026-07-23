import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { symbolNews, trades } from "@/lib/db/schema";
import { fetchPolygonNews, type NewsArticle, type Sentiment } from "@/lib/market/news";

export type { NewsArticle, Sentiment };
export interface PositionArticle extends NewsArticle {
  symbol: string;
}

/**
 * News is a property of the TICKER, not the user — so it's cached once per
 * symbol in `symbol_news` and every holder is served from that one row. A user's
 * open tickers are only used to *read* their slice of the cache.
 *
 *   read  (server render)  → cache only, zero upstream calls, instant
 *   refresh (client, once) → fetches only stale/missing symbols, bounded + deduped
 *
 * That's what keeps API usage flat as users grow: cost scales with the number of
 * DISTINCT open tickers across everyone, not the number of users.
 */

const TTL_MS = 6 * 60 * 60 * 1000; // a symbol is refreshed at most every 6h
const MAX_PER_REFRESH = 6; // fetches per invocation — a soft rate guard
const FEED_LIMIT = 8; // headlines shown across all positions

/** Distinct underlying symbols of a user's OPEN positions (option → underlying). */
export async function getUserOpenSymbols(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ symbol: trades.symbol })
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, "open")));
  return rows.map((r) => r.symbol).filter(Boolean).sort();
}

type CacheRow = { articles: NewsArticle[]; fetchedAt: Date | null };

async function readCache(symbols: string[]): Promise<Map<string, CacheRow>> {
  const m = new Map<string, CacheRow>();
  if (symbols.length === 0) return m;
  const rows = await db.select().from(symbolNews).where(inArray(symbolNews.symbol, symbols));
  for (const r of rows) {
    m.set(r.symbol, { articles: (r.articles as NewsArticle[] | null) ?? [], fetchedAt: r.fetchedAt });
  }
  return m;
}

const isStale = (c: CacheRow | undefined, now: number) =>
  !c || !c.fetchedAt || now - c.fetchedAt.getTime() > TTL_MS;

function merge(cache: Map<string, CacheRow>): PositionArticle[] {
  const all: PositionArticle[] = [];
  for (const [symbol, n] of cache) for (const a of n.articles) all.push({ ...a, symbol });
  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return all.slice(0, FEED_LIMIT);
}

/** Cache-only read for the server render — never calls upstream. */
export async function getCachedPositionsNews(
  userId: string,
): Promise<{ articles: PositionArticle[]; symbols: string[]; stale: boolean }> {
  const symbols = await getUserOpenSymbols(userId);
  if (symbols.length === 0) return { articles: [], symbols: [], stale: false };
  const cache = await readCache(symbols);
  const now = Date.now();
  const stale = symbols.some((s) => isStale(cache.get(s), now));
  return { articles: merge(cache), symbols, stale };
}

// Same-instance single-flight: two viewers of the same ticker share one fetch.
const inflight = new Map<string, Promise<void>>();

async function refreshOne(symbol: string): Promise<void> {
  const existing = inflight.get(symbol);
  if (existing) return existing;
  const p = (async () => {
    try {
      const articles = await fetchPolygonNews(symbol, 10);
      await db
        .insert(symbolNews)
        .values({ symbol, articles, fetchedAt: new Date(), error: null })
        .onConflictDoUpdate({
          target: symbolNews.symbol,
          set: { articles, fetchedAt: new Date(), error: null },
        });
    } catch (e) {
      // Record the error, stamp fetchedAt so we back off, keep serving what we have.
      const error = String(e).slice(0, 300);
      await db
        .insert(symbolNews)
        .values({ symbol, fetchedAt: new Date(), error })
        .onConflictDoUpdate({ target: symbolNews.symbol, set: { fetchedAt: new Date(), error } })
        .catch(() => {});
    } finally {
      inflight.delete(symbol);
    }
  })();
  inflight.set(symbol, p);
  return p;
}

/** Refresh only the stale/missing symbols (bounded + deduped), then return the feed. */
export async function refreshPositionsNews(
  userId: string,
): Promise<{ articles: PositionArticle[]; symbols: string[] }> {
  const symbols = await getUserOpenSymbols(userId);
  if (symbols.length === 0) return { articles: [], symbols: [] };
  const cache = await readCache(symbols);
  const now = Date.now();
  const stale = symbols.filter((s) => isStale(cache.get(s), now)).slice(0, MAX_PER_REFRESH);
  if (stale.length) await Promise.all(stale.map(refreshOne));
  const fresh = stale.length ? await readCache(symbols) : cache;
  return { articles: merge(fresh), symbols };
}
