"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./loaders";

/**
 * Lazy, code-split chart components. Each pulls in ECharts, so we load them off
 * the critical path — the page shell paints first and every chart shows a
 * spinner (ChartSkeleton) until its chunk + data are ready. Shared by the
 * analytics overview and the per-dimension detail pages.
 *
 * next/dynamic requires the options to be an inline object literal, so the
 * loading fallbacks are spelled out per chart rather than via a helper.
 */

export const PieCard = dynamic(() => import("./PieCard").then((m) => m.PieCard), {
  ssr: false,
  loading: () => <ChartSkeleton height={170} />,
});

export const DivergingBar = dynamic(() => import("./DivergingBar").then((m) => m.DivergingBar), {
  ssr: false,
  loading: () => <ChartSkeleton height={120} />,
});

export const ColumnChart = dynamic(() => import("./ColumnChart").then((m) => m.ColumnChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={190} />,
});

export const BarBreakdown = dynamic(() => import("./BarBreakdown").then((m) => m.BarBreakdown), {
  ssr: false,
  loading: () => <ChartSkeleton height={180} />,
});

export const DistributionCard = dynamic(() => import("./DistributionCard").then((m) => m.DistributionCard), {
  ssr: false,
  loading: () => <ChartSkeleton height={190} />,
});

export const ActivityChart = dynamic(() => import("./ActivityChart").then((m) => m.ActivityChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={180} />,
});

export const TreemapChart = dynamic(() => import("./TreemapChart").then((m) => m.TreemapChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={230} />,
});
