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

/** Vertical gradient (bars/columns) — solid at the base, softer at the tip. */
export const vGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color },
    { offset: 1, color: color + "A6" },
  ]);

/** Horizontal gradient (row bars). */
export const hGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: color + "A6" },
    { offset: 1, color },
  ]);

/** Soft area fill (line charts) — tinted at the top, fading to nothing. */
export const areaGrad = (color: string) =>
  new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: color + "33" },
    { offset: 1, color: color + "00" },
  ]);

export const tooltip = {
  trigger: "item" as const,
  backgroundColor: C.surface,
  borderColor: C.line,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: C.ink, fontSize: 12, fontWeight: 500 },
  extraCssText: "border-radius:12px;box-shadow:0 8px 24px rgba(20,24,31,0.10);",
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
}: {
  option: Record<string, unknown>;
  height?: number;
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
      />
    </div>
  );
}
