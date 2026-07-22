"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TablePagination from "@mui/material/TablePagination";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { SourceBadge } from "@/components/journal/SourceBadge";
import type { JournalTrade } from "@/lib/queries/journal";
import { tradeLabel } from "@/lib/trade-display";
import { usd, holdingLabel, hasTimeOfDay } from "@/lib/format";

const POS = "#17915f";
const NEG = "#bd4640";

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

const whenMs = (t: JournalTrade) =>
  (t.exitAt ? new Date(t.exitAt) : t.entryAt ? new Date(t.entryAt) : null)?.getTime() ?? null;

const price = (n: number | null): string | null =>
  n == null
    ? null
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TradeCell({ trade }: { trade: JournalTrade }) {
  const isOption = trade.kind === "option";
  const when = trade.exitAt ?? trade.entryAt;
  const entry = price(trade.avgEntryPrice);
  const exit = price(trade.avgExitPrice);
  const priceLeg = entry || exit ? `${entry ?? "—"} → ${exit ?? "—"}` : null;
  const size = Math.round(Math.max(trade.openedQty, trade.closedQty));
  const sizeLeg = size > 0 ? (isOption ? `×${size}` : `${size} sh`) : null;
  const dateLeg = when
    ? new Date(when).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const hasTime = hasTimeOfDay(trade.entryAt) || hasTimeOfDay(trade.exitAt);
  const holdLeg = hasTime && trade.holdingSeconds != null ? holdingLabel(trade.holdingSeconds) : null;
  const meta = [priceLeg, sizeLeg, dateLeg, holdLeg].filter(Boolean).join("  ·  ");

  const expShort = trade.expiry
    ? new Date(trade.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const dirLabel = !isOption
    ? trade.direction === "long"
      ? "Long"
      : "Short"
    : trade.direction === "short"
      ? "Short"
      : null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
        <Typography component="span" sx={{ fontSize: 14.5, fontWeight: 600 }}>
          {trade.symbol}
        </Typography>
        {isOption && trade.strike != null && (
          <Box
            component="span"
            sx={{
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: "action.hover",
              fontSize: 11,
              fontWeight: 600,
              color: "text.secondary",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${trade.strike} {trade.optionType === "call" ? "C" : "P"}
            {expShort ? ` · ${expShort}` : ""}
          </Box>
        )}
        {dirLabel && (
          <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.disabled" }}>
            {dirLabel}
          </Typography>
        )}
        <SourceBadge trade={trade} />
        {trade.status === "open" && <Chip label="Open" size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
        {trade.incomplete && <Chip label="Partial" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
      </Box>
      {meta && (
        <Typography noWrap sx={{ mt: 0.5, fontSize: 11.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {meta}
        </Typography>
      )}
    </Box>
  );
}

export function JournalTableMui({ trades }: { trades: JournalTrade[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  const filtered = useMemo(() => {
    let list = trades;
    if (filter === "open") {
      list = list.filter((t) => t.status === "open");
    } else {
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
    const val = (t: JournalTrade): number | null =>
      sortKey === "date" ? whenMs(t) : sortKey === "pnl" ? t.netPnl : t.pnlPct;
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const clampedPage = Math.min(page, Math.max(0, Math.ceil(sorted.length / rowsPerPage) - 1));
  const rows = sorted.slice(clampedPage * rowsPerPage, clampedPage * rowsPerPage + rowsPerPage);

  const sort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  return (
    <Card>
      <Box sx={{ px: 2, pt: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Tabs
          value={filter}
          onChange={(_, v) => {
            setFilter(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: 13 } }}
        >
          {FILTERS.map((f) => (
            <Tab key={f.key} value={f.key} label={f.label} />
          ))}
        </Tabs>
        <TextField
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search symbol…"
          size="small"
          sx={{ width: 200, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Table sx={{ "& td, & th": { borderColor: "divider" } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>
              <TableSortLabel active={sortKey === "date"} direction={sortDir} onClick={() => sort("date")}>
                Trade
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>
              <TableSortLabel active={sortKey === "pnl"} direction={sortDir} onClick={() => sort("pnl")}>
                Net P&L
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>
              <TableSortLabel active={sortKey === "pct"} direction={sortDir} onClick={() => sort("pct")}>
                Return
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} sx={{ textAlign: "center", py: 5, color: "text.secondary", fontSize: 13 }}>
                No trades match.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((t) => {
              const up = t.netPnl >= 0;
              return (
                <TableRow
                  key={t.id}
                  hover
                  onClick={() => router.push(`/journal/${t.id}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <TradeCell trade={t} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: t.incomplete ? "text.disabled" : up ? POS : NEG }}>
                    {t.incomplete ? "—" : usd(t.netPnl, { sign: true })}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: t.pnlPct == null ? "text.disabled" : t.pnlPct >= 0 ? POS : NEG }}>
                    {t.pnlPct == null ? "—" : `${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={sorted.length}
        page={clampedPage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 30, 50, 100]}
      />
    </Card>
  );
}
