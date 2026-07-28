import "server-only";

/**
 * Market-data provider boundary.
 *
 * Alpaca today; the interface exists so swapping to Polygon (or adding
 * per-contract options bars) is a new file, not a rewrite. Charts and MAE/MFE
 * both sit on this.
 */

export type Interval = "1min" | "5min" | "15min" | "30min" | "1hour" | "1day";

export interface Candle {
  ts: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface MarketDataProvider {
  readonly name: string;
  /** Bars for a symbol across [from, to]. Empty array when there's no data. */
  getBars(
    symbol: string,
    interval: Interval,
    from: Date,
    to: Date,
  ): Promise<Candle[]>;
}

/**
 * Massive (formerly Polygon.io) aggregates endpoint.
 *
 * The brand changed but the API host and shape did not — still
 * api.polygon.io/v2/aggs. Intraday bars for past dates work on the free tier,
 * which is enough for development; the commercial "external display" tier is a
 * launch concern, not an engineering one, and swapping to it is a header, not
 * a rewrite.
 */
const MASSIVE_TIMESPAN: Record<Interval, { multiplier: number; timespan: string }> = {
  "1min": { multiplier: 1, timespan: "minute" },
  "5min": { multiplier: 5, timespan: "minute" },
  "15min": { multiplier: 15, timespan: "minute" },
  "30min": { multiplier: 30, timespan: "minute" },
  "1hour": { multiplier: 1, timespan: "hour" },
  "1day": { multiplier: 1, timespan: "day" },
};

interface PolygonBar {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export class MassiveProvider implements MarketDataProvider {
  readonly name = "massive";

  constructor(private apiKey: string) {}

  async getBars(
    symbol: string,
    interval: Interval,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    const { multiplier, timespan } = MASSIVE_TIMESPAN[interval];
    // Millisecond bounds give exact intraday windows, not whole days.
    const first =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}` +
      `/range/${multiplier}/${timespan}/${from.getTime()}/${to.getTime()}` +
      `?adjusted=true&sort=asc&limit=50000`;

    const out: Candle[] = [];
    let url: string | null = first;
    let guard = 0;

    while (url && guard++ < 20) {
      const res: Response = await fetch(`${url}&apiKey=${this.apiKey}`, {
        // Past bars never change — let Next cache them for an hour.
        next: { revalidate: 60 * 60 },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Massive ${res.status} for ${symbol}: ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        results?: PolygonBar[];
        next_url?: string | null;
      };
      for (const b of json.results ?? []) {
        out.push({
          ts: new Date(b.t),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v ?? null,
        });
      }
      url = json.next_url ?? null;
    }

    return out;
  }
}

/** Alpaca's own timeframe strings. */
const ALPACA_TIMEFRAME: Record<Interval, string> = {
  "1min": "1Min",
  "5min": "5Min",
  "15min": "15Min",
  "30min": "30Min",
  "1hour": "1Hour",
  "1day": "1Day",
};

export class AlpacaProvider implements MarketDataProvider {
  readonly name = "alpaca";

  constructor(
    private keyId: string,
    private secretKey: string,
  ) {}

  async getBars(
    symbol: string,
    interval: Interval,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    const out: Candle[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(
        `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars`,
      );
      url.searchParams.set("timeframe", ALPACA_TIMEFRAME[interval]);
      url.searchParams.set("start", from.toISOString());
      url.searchParams.set("end", to.toISOString());
      url.searchParams.set("limit", "10000");
      url.searchParams.set("adjustment", "split");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": this.keyId,
          "APCA-API-SECRET-KEY": this.secretKey,
        },
        // Historical bars for a past window never change; let Next cache them.
        next: { revalidate: 60 * 60 },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Alpaca ${res.status} for ${symbol}: ${body.slice(0, 200)}`,
        );
      }

      const json = (await res.json()) as {
        bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[];
        next_page_token?: string | null;
      };

      for (const b of json.bars ?? []) {
        out.push({
          ts: new Date(b.t),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v ?? null,
        });
      }
      pageToken = json.next_page_token ?? undefined;
    } while (pageToken);

    return out;
  }
}
