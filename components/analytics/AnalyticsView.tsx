"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { EquityPanel } from "@/components/journal/EquityPanel";
import { keyFindingsCards } from "@/components/analytics/KeyFindings";
import {
  PieCard,
  DivergingBar,
  ColumnChart,
  BarBreakdown,
  DistributionCard,
  ActivityChart,
  TreemapChart,
} from "@/components/analytics/lazy-charts";
import { computeAnalytics, type AnalyticsTrade } from "@/lib/analysis/analytics";
import { RANGES, RANGE_LABEL, windowStart, type RangeKey } from "@/lib/analysis/range";
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
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color }}>
          {value}
        </Typography>
        {sub && <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

const cell = { mb: 2, breakInside: "avoid" } as const;

/**
 * The whole analytics page, driven by one date-range filter. Everything —
 * insights, KPIs, equity curve, every breakdown — recomputes client-side from
 * the same window, so switching 1M ↔ YTD is instant and the charts animate.
 */
export function AnalyticsView({ trades }: { trades: AnalyticsTrade[] }) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const now = useMemo(() => Date.now(), []);

  const filtered = useMemo(() => {
    if (range === "ALL") return trades;
    const from = windowStart(range, now);
    return trades.filter((t) => t.exitMs != null && t.exitMs >= from);
  }, [trades, range, now]);

  const a = useMemo(() => computeAnalytics(filtered), [filtered]);

  const series = useMemo(
    () =>
      trades
        .filter((t) => t.exitMs != null)
        .map((t) => ({ t: t.exitMs as number, pnl: t.pnl }))
        .sort((x, y) => x.t - y.t),
    [trades],
  );

  const long = a?.byDirection.find((b) => b.key === "long");
  const short = a?.byDirection.find((b) => b.key === "short");
  const findings = a ? keyFindingsCards(a) : [];

  return (
    <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 2, lg: 3 }, maxWidth: 1160, mx: "auto" }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: 26, lg: 30 } }}>
          Analytics
        </Typography>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v: RangeKey | null) => v && setRange(v)}
          sx={{
            bgcolor: "action.hover",
            borderRadius: 999,
            p: 0.25,
            "& .MuiToggleButton-root": {
              border: 0,
              borderRadius: "999px !important",
              px: 1.5,
              py: 0.5,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 12,
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.main" },
              },
            },
          }}
        >
          {RANGES.map((r) => (
            <ToggleButton key={r} value={r}>
              {r}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {!a ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" sx={{ fontSize: 16 }}>
              No closed trades {RANGE_LABEL[range]}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: "text.secondary" }}>
              Try a wider range — your full history is under ALL.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
            <Kpi label="Win rate" value={`${a.summary.winRate}%`} sub={`${a.summary.winners}W · ${a.summary.losers}L`} />
            <Kpi
              label="Payoff ratio"
              value={a.summary.payoffRatio != null ? `${a.summary.payoffRatio.toFixed(2)}×` : "—"}
              tone={a.summary.payoffRatio != null && a.summary.payoffRatio >= 1 ? "pos" : "neg"}
              sub="avg win ÷ avg loss"
            />
            <Kpi label="Max drawdown" value={a.summary.maxDrawdown > 0 ? usd(-a.summary.maxDrawdown) : "—"} tone="neg" sub="deepest dip" />
            <Kpi label="Avg hold" value={fmtHold(a.summary.avgHoldDays)} sub="per trade" />
          </Box>

          <Box sx={{ mb: 2 }}>
            <EquityPanel series={series} title="Equity" controlledRange={range} />
          </Box>

          {findings.length > 0 && (
            <Box sx={{ mb: 1.5, px: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Key findings</Typography>
              <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>how you actually trade</Typography>
            </Box>
          )}

          {/* One mosaic — behavioural findings first, then the breakdowns, all
              packed into two balanced columns so no card strands a gap. */}
          <Box sx={{ columnGap: 2, columnCount: { xs: 1, lg: 2 }, pb: 1 }}>
            {findings.map((card, i) => (
              <Box key={`kf-${i}`} sx={cell}>
                {card}
              </Box>
            ))}
            <Box sx={cell}>
              <PieCard title="Options vs stocks" question="Which instrument makes you money?" buckets={a.byType} href="/analytics/type" />
            </Box>
            <Box sx={cell}>
              <DivergingBar title="Long vs short" question="Bullish bets (longs & calls) vs bearish (shorts & puts)." left={long} right={short} href="/analytics/direction" />
            </Box>
            <Box sx={cell}>
              <BarBreakdown title="By day of week" question="When do you trade best?" buckets={a.byDayOfWeek} href="/analytics/days" />
            </Box>
            <Box sx={cell}>
              <ColumnChart title="By hold length" question="Do longer holds pay off?" buckets={a.byHold} emptyLabel="Needs execution times — connect your brokerage." href="/analytics/hold" />
            </Box>
            <Box sx={cell}>
              <ActivityChart monthly={a.monthly} href="/analytics/activity" />
            </Box>
            <Box sx={cell}>
              <TreemapChart title="Symbols" question="Where you make and lose the most — tile size is P/L." buckets={a.symbols} href="/analytics/symbols" />
            </Box>
            <Box sx={cell}>
              <DistributionCard buckets={a.distribution} />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

function fmtHold(days: number | null): string {
  if (days == null) return "—";
  if (days < 1) return "<1d";
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}
