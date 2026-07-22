"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { Interval } from "@/lib/market/provider";
import { fetchTradeCandles } from "@/app/(app)/journal/[id]/chart-actions";

export interface ChartCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

export interface TradeChartProps {
  candles: ChartCandle[];
  entryTime: number;
  exitTime: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  direction: "long" | "short";
  underlying: string;
  positive?: boolean;
  /** Initial interval + window, so the timeframe switch can refetch. */
  interval: Interval;
  fromMs: number;
  toMs: number;
}

const INTERVAL_MIN: Record<Interval, number> = {
  "1min": 1,
  "5min": 5,
  "15min": 15,
  "30min": 30,
  "1hour": 60,
  "1day": 1440,
};
const INTERVAL_LABEL: Record<Interval, string> = {
  "1min": "1m",
  "5min": "5m",
  "15min": "15m",
  "30min": "30m",
  "1hour": "1H",
  "1day": "1D",
};
// 1min is intentionally omitted — too noisy at trade scale. The visible set is
// span-filtered from these below.
const ALL_INTERVALS: Interval[] = ["5min", "15min", "30min", "1hour", "1day"];

/** TradingView's chart-URL codes for each bar width. */
const TV_INTERVAL: Record<Interval, string> = {
  "1min": "1",
  "5min": "5",
  "15min": "15",
  "30min": "30",
  "1hour": "60",
  "1day": "D",
};

/**
 * TradingView chart link for a symbol at a given bar width. Their public URL
 * takes only symbol + interval — it can't jump to a past timestamp — so this
 * opens the live chart at the timeframe currently selected here.
 */
function tradingViewUrl(symbol: string, interval: Interval): string {
  const params = new URLSearchParams({ symbol, interval: TV_INTERVAL[interval] });
  return `https://www.tradingview.com/chart/?${params.toString()}`;
}

/** Simple moving average; null until enough bars exist. */
function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** Wilder's RSI. */
function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    gain += Math.max(0, ch);
    loss += Math.max(0, -ch);
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(0, ch)) / period;
    loss = (loss * (period - 1) + Math.max(0, -ch)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

const toLine = (candles: ChartCandle[], vals: (number | null)[]) =>
  candles
    .map((c, i) => ({ time: c.time as Time, value: vals[i] }))
    .filter((p) => p.value != null) as { time: Time; value: number }[];

export function TradeChart(props: TradeChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [candles, setCandles] = useState(props.candles);
  const [interval, setIntervalState] = useState<Interval>(props.interval);
  // Indicators start off — the clean price picture reads first; the trader
  // opts into MA / RSI when they want them.
  const [showMA, setShowMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [loading, setLoading] = useState(false);

  const spanMin = (props.toMs - props.fromMs) / 60000;
  // Keep a timeframe if it yields a sane number of bars for this trade's span;
  // the current interval always stays so the active tab is never hidden.
  const intervals = ALL_INTERVALS.filter((iv) => {
    const n = spanMin / INTERVAL_MIN[iv];
    return (n >= 3 && n <= 3000) || iv === props.interval;
  });

  const changeInterval = async (iv: Interval) => {
    if (iv === interval || loading) return;
    setIntervalState(iv);
    setLoading(true);
    try {
      const next = await fetchTradeCandles(props.underlying, props.fromMs, props.toMs, iv);
      if (next.length) setCandles(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || candles.length === 0) return;

    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const pos = v("--pos", "#17915f");
    const neg = v("--neg", "#d0453b");
    const info = v("--info", "#3a5a9c");
    const amber = v("--amber", "#c68a1d");

    // A dark, elegant plotting surface so the red/green candles read cleanly.
    const canvas = "#111621";
    const axisText = "#9aa4b2";
    const gridLine = "rgba(255,255,255,0.06)";
    const axisBorder = "rgba(255,255,255,0.09)";

    const chart = createChart(el, {
      height: showRSI ? 400 : 320,
      layout: {
        background: { color: canvas },
        textColor: axisText,
        fontFamily: getComputedStyle(document.body).fontFamily,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: gridLine, style: 1 },
      },
      rightPriceScale: { borderColor: axisBorder, scaleMargins: { top: 0.08, bottom: 0.28 } },
      timeScale: { borderColor: axisBorder, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: true,
      handleScroll: true,
    });
    chartRef.current = chart;

    const hasVolume = candles.some((c) => c.volume != null && c.volume > 0);
    if (hasVolume) {
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volume.setData(
        candles.map((c) => ({
          time: c.time as Time,
          value: c.volume ?? 0,
          color: (c.close >= c.open ? pos : neg) + "40",
        })),
      );
    }

    const series = chart.addSeries(CandlestickSeries, {
      // Classic filled red/green candles — legible even when the chart is small.
      upColor: pos,
      downColor: neg,
      borderUpColor: pos,
      borderDownColor: neg,
      wickUpColor: pos,
      wickDownColor: neg,
      // The only reference lines that matter here are the entry/exit ("in"/"out").
      // Drop the default last-price line so it can't crowd them on the axis.
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    // Moving averages — fast + slow, thin and quiet so they inform without
    // fighting the candles. Off unless the trader wants them.
    if (showMA) {
      const closes = candles.map((c) => c.close);
      for (const [period, color] of [
        [9, info],
        [21, amber],
      ] as const) {
        const ma = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        ma.setData(toLine(candles, sma(closes, period)));
      }
    }

    // RSI in its own pane, with 30/70 guides.
    if (showRSI) {
      const rsiSeries = chart.addSeries(
        LineSeries,
        { color: info, lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
        1,
      );
      rsiSeries.setData(toLine(candles, rsi(candles.map((c) => c.close))));
      for (const [lvl, col] of [
        [70, neg],
        [30, pos],
      ] as const) {
        rsiSeries.createPriceLine({
          price: lvl,
          color: col,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: String(lvl),
        });
      }
      chart.panes()[1]?.setHeight(96);
    }

    const markers: SeriesMarker<Time>[] = [
      {
        time: props.entryTime as Time,
        position: "belowBar",
        color: pos,
        shape: "arrowUp",
        text: "Entry",
      },
    ];
    if (props.exitTime) {
      markers.push({
        time: props.exitTime as Time,
        position: "aboveBar",
        color: neg,
        shape: "arrowDown",
        text: "Exit",
      });
    }
    createSeriesMarkers(series, markers);

    if (props.entryPrice != null) {
      series.createPriceLine({
        price: props.entryPrice,
        color: pos,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "in",
      });
    }
    if (props.exitPrice != null) {
      series.createPriceLine({
        price: props.exitPrice,
        color: neg,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "out",
      });
    }

    chart.timeScale().fitContent();

    const times = candles.map((c) => c.time);
    const nearest = (t: number) =>
      times.reduce((best, cur) => (Math.abs(cur - t) < Math.abs(best - t) ? cur : best), times[0]);
    const bandStart = nearest(props.entryTime);
    const bandEnd = props.exitTime ? nearest(props.exitTime) : times[times.length - 1];
    // A soft light highlight of the hold window over the dark canvas.
    const bandColor = "rgba(255,255,255,0.06)";

    const updateBand = () => {
      const band = bandRef.current;
      if (!band) return;
      const ts = chart.timeScale();
      const x1 = ts.timeToCoordinate(bandStart as Time);
      const x2 = ts.timeToCoordinate(bandEnd as Time);
      if (x1 == null || x2 == null) {
        band.style.display = "none";
        return;
      }
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      band.style.display = "block";
      band.style.left = `${left}px`;
      band.style.width = `${Math.max(2, right - left)}px`;
      band.style.height = `${chart.panes()[0]?.getHeight() ?? 0}px`;
      band.style.background = bandColor;
    };

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      updateBand();
    });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });
    updateBand();
    chart.timeScale().subscribeVisibleTimeRangeChange(updateBand);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    candles,
    showMA,
    showRSI,
    props.entryTime,
    props.exitTime,
    props.entryPrice,
    props.exitPrice,
    props.direction,
    props.positive,
  ]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface-2/60 p-0.5">
          {intervals.map((iv) => (
            <button
              key={iv}
              onClick={() => changeInterval(iv)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                interval === iv ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {INTERVAL_LABEL[iv]}
            </button>
          ))}
          {loading && <span className="px-1.5 text-[11px] text-ink-faint">…</span>}
        </div>

        <div className="flex items-center gap-2.5">
          {showMA && (
            <div className="hidden items-center gap-2 text-[10.5px] font-semibold text-ink-faint sm:flex">
              <span className="flex items-center gap-1">
                <span className="h-[2px] w-3.5 rounded-full bg-info" />
                MA9
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[2px] w-3.5 rounded-full bg-amber" />
                MA21
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Toggle label="MA" on={showMA} onClick={() => setShowMA((s) => !s)} />
            <Toggle label="RSI" on={showRSI} onClick={() => setShowRSI((s) => !s)} />
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="relative w-full overflow-hidden rounded-xl"
        style={{ background: "#111621" }}
      >
        <div
          ref={bandRef}
          className="pointer-events-none absolute top-0 z-[1] hidden"
        />
      </div>

      <div className="mt-2 flex justify-end">
        <a
          href={tradingViewUrl(props.underlying, interval)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-faint transition-colors hover:text-info"
        >
          Open {props.underlying} on TradingView · {INTERVAL_LABEL[interval]}
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
        on
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
