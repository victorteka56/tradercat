"use client";

import { useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

/**
 * Shared ECharts wrapper + theme, tuned to TraderCat's palette. One place to
 * keep the premium details consistent: gradient fills, soft rounded bars, quiet
 * axes, and a styled tooltip. Every analytics chart renders through this.
 */

export const C = {
  pos: "#17915f",
  neg: "#bd4640",
  info: "#3a5a9c",
  amber: "#c68a1d",
  ink: "#14181f",
  inkSoft: "#59616e",
  inkFaint: "#8b94a3",
  line: "#e7eaf0",
  surface: "#ffffff",
  surface2: "#f1f3f6",
};

// The categorical palette now lives in a plain module so server components can
// share it; re-exported here so chart code keeps importing from one place.
export { PALETTE, CAT, CASH_COLOR } from "@/lib/chart-colors";

/** Glossy vertical gradient (bars/columns) — a light highlight at the tip that
 *  deepens toward the base, so a bar reads as a solid object with volume. */
export const vGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: color + "FF" },
    { offset: 0.55, color },
    { offset: 1, color: shade(color, -0.14) },
  ]);

/** Glossy horizontal gradient (row bars) — deepens toward the value end. */
export const hGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: shade(color, -0.12) },
    { offset: 0.5, color },
    { offset: 1, color: color + "FF" },
  ]);

/** Soft area fill (line charts) — richer tint at the top, fading to nothing. */
export const areaGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: color + "45" },
    { offset: 0.7, color: color + "12" },
    { offset: 1, color: color + "00" },
  ]);

/** Darken/lighten a #rrggbb by a fraction (-1..1). */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amt));
  const g = clamp(((n >> 8) & 255) * (1 + amt));
  const b = clamp((n & 255) * (1 + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Soft drop shadow for bars/marks — the main "premium" sense of depth. */
export const barShadow = {
  shadowBlur: 10,
  shadowColor: "rgba(20,24,31,0.12)",
  shadowOffsetY: 3,
};

/** Hover state for bars: the rest recede, the hovered mark lifts. */
export const emphasisBar = {
  focus: "series" as const,
  itemStyle: {
    shadowBlur: 20,
    shadowColor: "rgba(20,24,31,0.22)",
    shadowOffsetY: 5,
  },
};

export const tooltip = {
  trigger: "item" as const,
  backgroundColor: C.surface,
  borderColor: C.line,
  borderWidth: 1,
  padding: [9, 13],
  textStyle: { color: C.ink, fontSize: 12, fontWeight: 500 },
  extraCssText:
    "border-radius:14px;box-shadow:0 12px 32px rgba(20,24,31,0.14),0 2px 6px rgba(20,24,31,0.06);",
};

export const BASE = {
  animationDuration: 650,
  animationDurationUpdate: 550,
  animationEasing: "cubicOut" as const,
  animationEasingUpdate: "cubicOut" as const,
  textStyle: { fontFamily: "inherit" },
};

export function EChart({
  option,
  height = 210,
  onEvents,
}: {
  option: Record<string, unknown>;
  height?: number;
  /** ECharts event handlers, e.g. `{ mouseover, globalout }` for hover readouts. */
  onEvents?: Record<string, (params: never) => void>;
}) {
  const chartRef = useRef<ReactECharts>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // ECharts can lay out before the flex/grid container has its final width and
  // then never recompute. Observe the box (the observer also fires once on
  // mount) and resize the instance so bars/donuts always fill their space.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef}>
      <ReactECharts
        ref={chartRef}
        echarts={echarts}
        option={{ ...BASE, ...option }}
        notMerge
        lazyUpdate
        style={{ height, width: "100%" }}
        opts={{ renderer: "canvas" }}
        onEvents={onEvents}
      />
    </div>
  );
}
