"use client";

import { useMemo, useState } from "react";
import type { DailyPnl } from "@/lib/queries/journal";
import { usdCompact } from "@/lib/format";

/**
 * Month calendar of realized P/L. Deliberately quiet: no-trade days stay plain
 * grey, only trading days pick up a soft green/red tint so the winning and
 * losing days read at a glance without shouting. Navigation is client-side —
 * all days are passed once and filtered per month.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayKey(): string {
  // "today" in market time, so the highlight matches the ET day keys.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

export function JournalCalendar({ days }: { days: DailyPnl[] }) {
  const byDay = useMemo(() => {
    const m = new Map<string, DailyPnl>();
    for (const d of days) m.set(d.day, d);
    return m;
  }, [days]);

  const today = todayKey();
  const [ty, tmRaw] = today.split("-");
  const [cursor, setCursor] = useState({ y: Number(ty), m: Number(tmRaw) - 1 });

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  };
  const thisMonth = () => {
    const [y, m] = today.split("-");
    setCursor({ y: Number(y), m: Number(m) - 1 });
  };

  const firstWeekday = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();

  // Monthly summary — sum only the days that fall in the viewed month.
  const summary = useMemo(() => {
    let pnl = 0;
    let tradingDays = 0;
    let trades = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const entry = byDay.get(key(cursor.y, cursor.m, d));
      if (entry) {
        pnl += entry.pnl;
        trades += entry.trades;
        tradingDays++;
      }
    }
    return { pnl, tradingDays, trades };
  }, [byDay, cursor, daysInMonth]);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* Header: month nav + monthly summary */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => move(-1)} dir="prev" />
          <span className="min-w-[130px] text-center text-[15px] font-semibold text-ink">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          <NavBtn onClick={() => move(1)} dir="next" />
          <button
            onClick={thisMonth}
            className="ml-2 h-8 rounded-full border border-line bg-surface px-3 text-[12px] font-semibold text-ink-soft hover:bg-surface-2"
          >
            This month
          </button>
        </div>

        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="text-ink-faint">This month</span>
          <span
            className={`tnum rounded-full px-2.5 py-1 font-semibold ${
              summary.pnl >= 0
                ? "bg-pos/10 text-pos"
                : "bg-neg/10 text-neg"
            }`}
          >
            {summary.tradingDays ? usdCompact(summary.pnl) : "—"}
          </span>
          <span className="tnum rounded-full bg-surface-2 px-2.5 py-1 font-semibold text-ink-soft">
            {summary.tradingDays} day{summary.tradingDays === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const k = key(cursor.y, cursor.m, day);
          const entry = byDay.get(k);
          const isToday = k === today;
          const win = entry ? entry.pnl >= 0 : false;

          return (
            <div
              key={k}
              className={`relative flex min-h-[64px] flex-col rounded-xl border p-1.5 sm:min-h-[92px] sm:p-2 ${
                entry
                  ? win
                    ? "border-pos/20 bg-pos/[0.06]"
                    : "border-neg/20 bg-neg/[0.06]"
                  : "border-line bg-surface-2/40"
              } ${isToday ? "ring-2 ring-info ring-offset-1" : ""}`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`text-[11px] font-semibold sm:text-[12px] ${
                    entry ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {day}
                </span>
                {entry && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      win ? "bg-pos" : "bg-neg"
                    }`}
                  />
                )}
              </div>

              {entry && (
                <div className="mt-auto">
                  <div
                    className={`tnum text-[12px] font-semibold leading-tight sm:text-[14px] ${
                      win ? "text-pos" : "text-neg"
                    }`}
                  >
                    {usdCompact(entry.pnl)}
                  </div>
                  <div className="tnum text-[10px] text-ink-faint sm:text-[11px]">
                    {entry.trades} trade{entry.trades === 1 ? "" : "s"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({ onClick, dir }: { onClick: () => void; dir: "prev" | "next" }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: dir === "next" ? "rotate(180deg)" : undefined }}
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
