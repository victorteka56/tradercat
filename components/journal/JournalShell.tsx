"use client";

import NextLink from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import { setJournalView, type JournalView } from "@/app/(app)/journal/view-actions";
import type { JournalStats, JournalTrade, TradeHighlights } from "@/lib/queries/journal";
import { tradeLabel } from "@/lib/trade-display";
import { usd } from "@/lib/format";

const POS = "#17915f";
const NEG = "#bd4640";

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  const color = tone === "pos" ? POS : tone === "neg" ? NEG : "text.primary";
  return (
    <Card>
      <CardContent>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ mt: 0.5, fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color }}
        >
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>{sub}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

const fmtPct = (t: JournalTrade) =>
  t.pnlPct == null ? "—" : `${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(1)}%`;

function Highlight({
  eyebrow,
  trade,
  mode,
}: {
  eyebrow: string;
  trade: JournalTrade | null;
  mode: "usd" | "pct";
}) {
  if (!trade) {
    return (
      <Card>
        <CardContent>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
            {eyebrow}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 18, fontWeight: 600, color: "text.disabled" }}>—</Typography>
          <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>No trades yet</Typography>
        </CardContent>
      </Card>
    );
  }
  const up = trade.netPnl >= 0;
  const primary = mode === "usd" ? usd(trade.netPnl, { sign: true }) : fmtPct(trade);
  const secondary = mode === "usd" ? fmtPct(trade) : usd(trade.netPnl, { sign: true });
  return (
    <Card>
      <CardActionArea component={NextLink} href={`/journal/${trade.id}`} sx={{ height: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
              {eyebrow}
            </Typography>
            <ArrowForwardIosRoundedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
          </Box>
          <Typography sx={{ mt: 1, fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: up ? POS : NEG }}>
            {primary}
          </Typography>
          <Box sx={{ mt: 0.25, display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 600 }}>
              {tradeLabel(trade)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {secondary}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function JournalShell({
  stats,
  highlights,
  view,
  children,
}: {
  stats: JournalStats;
  highlights: TradeHighlights;
  view: JournalView;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const setView = (_: unknown, v: JournalView | null) => {
    if (!v || v === view || pending) return;
    start(async () => {
      await setJournalView(v);
      router.refresh();
    });
  };

  return (
    <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 2, lg: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "flex-end" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 26, lg: 30 } }}>
            Journal
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
            {stats.totalTrades.toLocaleString()} trades ·{" "}
            <Box component="span" sx={{ color: stats.netPnl >= 0 ? POS : NEG, fontWeight: 600 }}>
              {usd(stats.netPnl, { sign: true })} realized
            </Box>
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={setView} disabled={pending}>
            <ToggleButton value="table" sx={{ px: 1.75 }}>
              <ViewListRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
              Table
            </ToggleButton>
            <ToggleButton value="calendar" sx={{ px: 1.75 }}>
              <CalendarMonthRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
              Calendar
            </ToggleButton>
          </ToggleButtonGroup>
          <Button component={NextLink} href="/import" variant="outlined" color="inherit" startIcon={<FileUploadRoundedIcon />}>
            Import
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
        <Kpi label="Realized P/L" value={usd(stats.netPnl, { sign: true })} tone={stats.netPnl >= 0 ? "pos" : "neg"} sub={`${stats.closedTrades} closed`} />
        <Kpi label="Win rate" value={`${stats.winRate}%`} sub={`${stats.winners}W · ${stats.losers}L`} />
        <Kpi label="Avg winner" value={usd(stats.avgWinner, { sign: true })} tone="pos" />
        <Kpi label="Avg loser" value={usd(stats.avgLoser, { sign: true })} tone="neg" />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
        <Highlight eyebrow="Largest gain" trade={highlights.biggestGain} mode="usd" />
        <Highlight eyebrow="Largest loss" trade={highlights.biggestLoss} mode="usd" />
        <Highlight eyebrow="Best return" trade={highlights.bestReturn} mode="pct" />
        <Highlight eyebrow="Worst return" trade={highlights.worstReturn} mode="pct" />
      </Box>

      {children}
    </Box>
  );
}
