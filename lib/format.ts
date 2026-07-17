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

export const holdingLabel = (seconds: number) => {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};
