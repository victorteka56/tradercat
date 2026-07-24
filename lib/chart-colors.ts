/**
 * The shared categorical chart palette (slate / teal / amber / violet / rose).
 *
 * Lives in a plain module — not the client-only ECharts wrapper — so server
 * components can colour legends, dots and bars with exactly the same values the
 * charts use. Green/red stays reserved for where it *means* profit vs loss.
 *
 * Validated with the dataviz palette checker (light surface): CVD ΔE ≥ 11.5,
 * chroma ≥ floor, contrast ≥ 3:1.
 */
export const PALETTE = {
  slate: "#3a5a9c",
  teal: "#009e88",
  amber: "#a3741a",
  violet: "#6d5b9e",
  rose: "#c05f6a",
};

/** Fixed categorical order for composition charts (donut segments, etc.). */
export const CAT = [PALETTE.slate, PALETTE.amber, PALETTE.teal, PALETTE.violet, PALETTE.rose];

/** Uncommitted cash — deliberately neutral so it never competes with a holding. */
export const CASH_COLOR = "#aab2bf";

/** Gain/loss, mirroring --pos/--neg in globals.css for non-CSS contexts. */
export const POS = "#17915f";
export const NEG = "#bd4640";

/**
 * Lighten a #rrggbb toward white by a fraction (0..1).
 *
 * Used to tint successive holdings within one asset class: hue carries the
 * class, lightness separates the positions inside it. That way a ring of
 * individual holdings still reads as "mostly options" at a glance, which a set
 * of unrelated colours never would.
 */
export function lighten(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * One colour per asset class, used everywhere the portfolio splits by class —
 * donut slices, legend swatches, table section headers. Holding a single
 * mapping is what lets a reader connect a slice to its rows without a lookup.
 */
export const ASSET_COLOR: Record<string, string> = {
  option: PALETTE.slate,
  stock: PALETTE.teal,
  fund: PALETTE.violet,
  crypto: PALETTE.amber,
  cash: CASH_COLOR,
};

export const ASSET_LABEL: Record<string, string> = {
  option: "Options",
  stock: "Stocks",
  fund: "Funds & ETFs",
  crypto: "Crypto",
  cash: "Cash",
};
