"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { SourceBadge } from "@/components/journal/SourceBadge";
import type { JournalTrade } from "@/lib/queries/journal";
import { tradeLabel, hasRealizedPnl } from "@/lib/trade-display";
import { usd, holdingLabel, hasTimeOfDay } from "@/lib/format";

type Filter = "all" | "wins" | "losses" | "options" | "stocks" | "open";
type SortKey = "date" | "pnl" | "pct";
type SortDir = "asc" | "desc";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "options", label: "Options" },
  { key: "stocks", label: "Stocks" },
  { key: "open", label: "Open" },
];

const PAGE_SIZES = [10, 25, 30, 50, 100];

const when = (t: JournalTrade) =>
  (t.exitAt ? new Date(t.exitAt) : t.entryAt ? new Date(t.entryAt) : null)?.getTime() ??
  null;

export function JournalTable({ trades }: { trades: JournalTrade[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(0);

  // Any change to the result set resets to the first page.
  useEffect(() => setPage(0), [filter, query, sortKey, sortDir, pageSize]);

  const filtered = useMemo(() => {
    let list = trades;
    if (filter === "open") {
      list = list.filter((t) => t.status === "open");
    } else {
      // Every non-Open view is realized trades only — still-open positions
      // (open stocks, crypto) live exclusively under the Open tab so the
      // journal reads as a record of closed trades.
      list = list.filter((t) => t.status !== "open");
      if (filter === "wins") list = list.filter((t) => t.netPnl > 0 && !t.incomplete);
      else if (filter === "losses") list = list.filter((t) => t.netPnl < 0 && !t.incomplete);
      else if (filter === "options") list = list.filter((t) => t.kind === "option");
      else if (filter === "stocks") list = list.filter((t) => t.kind === "stock");
    }
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((t) => tradeLabel(t).toUpperCase().includes(q));
    return list;
  }, [trades, filter, query]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    // Nulls always sink to the bottom, whichever direction.
    const val = (t: JournalTrade): number | null =>
      sortKey === "date" ? when(t) : sortKey === "pnl" ? t.netPnl : t.pnlPct;
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, pages - 1);
  const start = clampedPage * pageSize;
  const rows = sorted.slice(start, start + pageSize);

  const sort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div>
      {/* Filters + search */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
                filter === f.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol…"
          className="ml-auto h-9 w-40 rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-info"
        />
      </div>

      <SurfaceCard className="overflow-hidden">
        {/* Sortable header */}
        <div className="flex items-center gap-3 border-b border-line py-2.5 pl-4 pr-7 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          <SortHeader
            className="flex-1 justify-start"
            label="Trade"
            active={sortKey === "date"}
            dir={sortDir}
            onClick={() => sort("date")}
          />
          <SortHeader
            className="w-28 justify-end"
            label="Net P&L"
            active={sortKey === "pnl"}
            dir={sortDir}
            onClick={() => sort("pnl")}
          />
          <SortHeader
            className="w-20 justify-end"
            label="Return"
            active={sortKey === "pct"}
            dir={sortDir}
            onClick={() => sort("pct")}
          />
        </div>

        <div className="divide-y divide-line">
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-ink-soft">
              No trades match.
            </div>
          ) : (
            rows.map((t) => <Row key={t.id} trade={t} />)
          )}
        </div>
      </SurfaceCard>

      {/* Pagination + page size */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-soft">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-full border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink outline-none"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="tnum text-ink-faint">
            {total === 0 ? "0" : `${start + 1}–${Math.min(start + pageSize, total)}`} of{" "}
            {total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PageBtn disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
            ‹ Prev
          </PageBtn>
          <span className="tnum text-[12.5px] font-semibold text-ink-soft">
            {clampedPage + 1} / {pages}
          </span>
          <PageBtn
            disabled={clampedPage >= pages - 1}
            onClick={() => setPage(clampedPage + 1)}
          >
            Next ›
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink ${
        active ? "text-ink" : ""
      } ${className}`}
    >
      {label}
      <Caret active={active} dir={dir} />
    </button>
  );
}

function Caret({ active, dir }: { active: boolean; dir: SortDir }) {
  const up = active && dir === "asc" ? "text-ink" : "text-ink-faint/40";
  const down = active && dir === "desc" ? "text-ink" : "text-ink-faint/40";
  return (
    <span className="ml-0.5 flex flex-col items-center gap-[2px]">
      <svg viewBox="0 0 8 5" width="7" height="4.5" className={`fill-current ${up}`}>
        <path d="M4 0 8 5H0z" />
      </svg>
      <svg viewBox="0 0 8 5" width="7" height="4.5" className={`fill-current ${down}`}>
        <path d="M4 5 0 0h8z" />
      </svg>
    </span>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-full border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const price = (n: number | null): string | null =>
  n == null
    ? null
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Row({ trade }: { trade: JournalTrade }) {
  const isOption = trade.kind === "option";
  const realized = hasRealizedPnl(trade);
  const up = trade.netPnl >= 0;
  const when = trade.exitAt ?? trade.entryAt;

  const entry = price(trade.avgEntryPrice);
  const exit = price(trade.avgExitPrice);
  const priceLeg = entry || exit ? `${entry ?? "—"} → ${exit ?? "—"}` : null;

  const size = Math.round(Math.max(trade.openedQty, trade.closedQty));
  const sizeLeg = size > 0 ? (isOption ? `×${size}` : `${size} sh`) : null;

  const dateLeg = when
    ? new Date(when).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  // Holding time is only real when the fills carry an intraday timestamp;
  // date-only CSV rows would otherwise read a misleading "0m".
  const hasTime = hasTimeOfDay(trade.entryAt) || hasTimeOfDay(trade.exitAt);
  const holdLeg =
    hasTime && trade.holdingSeconds != null ? holdingLabel(trade.holdingSeconds) : null;

  const meta = [priceLeg, sizeLeg, dateLeg, holdLeg].filter(Boolean);

  // Strike + expiry read as one contract identity: "$570 C · Jul 23".
  const expShort = trade.expiry
    ? new Date(trade.expiry).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        // An expiry is a calendar date stored at UTC midnight — formatting it in
        // local time would shift it a day back for anyone west of UTC.
        timeZone: "UTC",
      })
    : null;

  // A bought put/call is technically "long the contract", but showing LONG next
  // to PUT reads as a contradiction. For options the Call/Put carries the
  // direction; only a genuinely short (written) option is worth flagging.
  const dirLabel =
    !isOption
      ? trade.direction === "long"
        ? "Long"
        : "Short"
      : trade.direction === "short"
      ? "Short"
      : null;

  return (
    <Link
      href={`/journal/${trade.id}`}
      className="group relative flex items-center gap-3 py-3 pl-4 pr-7 transition-colors hover:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[14.5px] font-semibold tracking-tight text-ink">
            {trade.symbol}
          </span>
          {isOption && trade.strike != null && (
            <span className="tnum rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
              ${trade.strike} {trade.optionType === "call" ? "C" : "P"}
              {expShort ? <span className="text-ink-faint"> · {expShort}</span> : null}
            </span>
          )}
          {dirLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              {dirLabel}
            </span>
          )}
          <SourceBadge trade={trade} />
          {trade.status === "open" && <StatusChip tone="info">Open</StatusChip>}
          {trade.incomplete && <StatusChip tone="neutral">Partial</StatusChip>}
        </div>
        {meta.length > 0 && (
          <div className="tnum mt-1 truncate text-[11.5px] text-ink-soft">
            {meta.join("  ·  ")}
          </div>
        )}
      </div>

      <div
        className={`tnum w-28 text-right text-[14.5px] font-semibold ${
          !realized ? "text-ink-faint" : up ? "text-pos" : "text-neg"
        }`}
      >
        {realized ? usd(trade.netPnl, { sign: true }) : "—"}
      </div>

      <div
        className={`tnum w-20 text-right text-[13px] font-medium ${
          trade.pnlPct == null
            ? "text-ink-faint"
            : trade.pnlPct >= 0
            ? "text-pos"
            : "text-neg"
        }`}
      >
        {trade.pnlPct == null
          ? "—"
          : `${trade.pnlPct >= 0 ? "+" : ""}${trade.pnlPct.toFixed(1)}%`}
      </div>

      <svg
        viewBox="0 0 24 24"
        className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
