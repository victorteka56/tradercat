import "server-only";

/**
 * Polygon ticker-news reader (the same key that powers candles — "MASSIVE_API_KEY"
 * is a Polygon key). Returns the latest headlines for one symbol, newest first,
 * with the per-ticker sentiment Polygon ships in `insights`. Callers cache the
 * result by symbol so this is only ever hit once per ticker per refresh window.
 */

export type Sentiment = "positive" | "negative" | "neutral";

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  /** ISO timestamp */
  publishedAt: string;
  snippet: string | null;
  imageUrl: string | null;
  sentiment: Sentiment | null;
}

const BASE = "https://api.polygon.io";

interface PolygonArticle {
  title?: string;
  article_url?: string;
  published_utc?: string;
  description?: string;
  image_url?: string;
  publisher?: { name?: string };
  insights?: { ticker?: string; sentiment?: string }[];
}

export const newsConfigured = Boolean(process.env.MASSIVE_API_KEY);

/**
 * Fetch recent news for a ticker. Throws on a non-OK response so the caller can
 * record the error and keep serving stale/empty — never returns bad data.
 */
export async function fetchPolygonNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) return [];

  const url =
    `${BASE}/v2/reference/news?ticker=${encodeURIComponent(symbol)}` +
    `&order=desc&limit=${limit}&apiKey=${key}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polygon news ${res.status}`);

  const json = (await res.json()) as { results?: PolygonArticle[] };
  return (json.results ?? [])
    .filter((r) => r.title && r.article_url && r.published_utc)
    .map((r): NewsArticle => {
      const ins = (r.insights ?? []).find((i) => i.ticker === symbol) ?? r.insights?.[0];
      const s = ins?.sentiment;
      return {
        title: r.title!,
        url: r.article_url!,
        source: r.publisher?.name ?? "News",
        publishedAt: r.published_utc!,
        snippet: r.description ?? null,
        imageUrl: r.image_url ?? null,
        sentiment: s === "positive" || s === "negative" || s === "neutral" ? s : null,
      };
    });
}
