export const usd = (n: number, opts: { sign?: boolean } = {}) => {
  const sign = opts.sign && n > 0 ? "+" : "";
  return `${sign}${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const pct = (n: number, opts: { sign?: boolean } = {}) => {
  const sign = opts.sign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};

export const rMultiple = (r: number) => `${r > 0 ? "+" : ""}${r.toFixed(2)}R`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export const timeOfDay = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Traders think in market time, so timestamps render in ET regardless of where
 * the server or viewer sits.
 */
const MARKET_TZ = "America/New_York";

/**
 * True when a timestamp carries a real execution time.
 *
 * Date-only feeds (the Robinhood CSV) land on exact UTC midnight. No US equity
 * or option fill happens at 00:00:00.000 UTC, so midnight reliably means "the
 * source gave us a date, not a time" — and we must not render 12:00 AM as if
 * it were real.
 */
export const hasTimeOfDay = (d: Date | string | null | undefined): boolean => {
  if (!d) return false;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCHours() !== 0 ||
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  );
};

/** "Jun 29, 2026" */
export const dayLabel = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: MARKET_TZ,
  });
};

/** "9:47:03 AM ET" — only meaningful when hasTimeOfDay() is true. */
export const timeLabel = (d: Date | string | null | undefined): string | null => {
  if (!hasTimeOfDay(d)) return null;
  return (
    new Date(d!).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: MARKET_TZ,
    }) + " ET"
  );
};

/** Date plus time when we have it; date alone when we don't. */
export const dateTimeLabel = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  const t = timeLabel(d);
  return t ? `${dayLabel(d)} · ${t}` : dayLabel(d);
};

/** Compact money for dense surfaces: +$3.36K, -$1.2K, +$940. */
export const usdCompact = (n: number): string => {
  const sign = n < 0 ? "-" : "+";
  const a = Math.abs(n);
  if (a >= 1000) {
    const k = a / 1000;
    return `${sign}$${k >= 100 ? Math.round(k) : k.toFixed(k >= 10 ? 1 : 2)}K`;
  }
  return `${sign}$${Math.round(a)}`;
};

export const holdingLabel = (seconds: number) => {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};
