/** Shared date-range windowing for the equity panel and the analytics filter. */

export const RANGES = ["24H", "1W", "1M", "YTD", "ALL"] as const;
export type RangeKey = (typeof RANGES)[number];

export const RANGE_LABEL: Record<RangeKey, string> = {
  "24H": "past 24 hours",
  "1W": "past week",
  "1M": "past month",
  YTD: "year to date",
  ALL: "all time",
};

/** Epoch-ms start of the window. -Infinity for ALL (no lower bound). */
export function windowStart(key: RangeKey, now: number): number {
  const d = new Date(now);
  switch (key) {
    case "24H":
      return now - 24 * 3600 * 1000;
    case "1W":
      return now - 7 * 86400 * 1000;
    case "1M":
      d.setMonth(d.getMonth() - 1);
      return d.getTime();
    case "YTD":
      return new Date(d.getFullYear(), 0, 1).getTime();
    case "ALL":
      return -Infinity;
  }
}
