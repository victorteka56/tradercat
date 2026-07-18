"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

export interface ChartCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeChartProps {
  candles: ChartCandle[];
  /** Unix seconds. */
  entryTime: number;
  exitTime: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  direction: "long" | "short";
  underlying: string;
}

/**
 * One trade, plotted on its underlying.
 *
 * Deliberately minimal: no indicators, no drawing tools, no timeframe switcher.
 * A journal reader is answering one question — "where did I buy and sell?" —
 * and every extra control makes that harder to see. Labels say "You bought" /
 * "You sold" rather than "entry"/"exit" so it reads without a trading glossary.
 */
export function TradeChart(props: TradeChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || props.candles.length === 0) return;

    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;

    const ink = v("--ink", "#14181f");
    const inkFaint = v("--ink-faint", "#8b94a3");
    const line = v("--line", "#e7eaf0");
    const pos = v("--pos", "#17915f");
    const neg = v("--neg", "#d0453b");
    const info = v("--info", "#3a5a9c");

    const chart = createChart(el, {
      height: 320,
      layout: {
        background: { color: "transparent" },
        textColor: inkFaint,
        fontFamily: getComputedStyle(document.body).fontFamily,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: line, style: 1 },
      },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: false,
      handleScroll: false,
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: pos,
      downColor: neg,
      borderUpColor: pos,
      borderDownColor: neg,
      wickUpColor: pos,
      wickDownColor: neg,
    });
    series.setData(
      props.candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    // Plain-language markers — "You bought", not "Entry".
    const markers: SeriesMarker<Time>[] = [
      {
        time: props.entryTime as Time,
        position: "belowBar",
        color: info,
        shape: "arrowUp",
        text: props.direction === "long" ? "You bought" : "You sold short",
      },
    ];
    if (props.exitTime) {
      markers.push({
        time: props.exitTime as Time,
        position: "aboveBar",
        color: ink,
        shape: "arrowDown",
        text: props.direction === "long" ? "You sold" : "You covered",
      });
    }
    createSeriesMarkers(series, markers);

    // Faint guides at the underlying's price when you acted.
    if (props.entryPrice != null) {
      series.createPriceLine({
        price: props.entryPrice,
        color: info,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "in",
      });
    }
    if (props.exitPrice != null) {
      series.createPriceLine({
        price: props.exitPrice,
        color: ink,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "out",
      });
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() =>
      chart.applyOptions({ width: el.clientWidth }),
    );
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [props]);

  return <div ref={ref} className="w-full" />;
}
