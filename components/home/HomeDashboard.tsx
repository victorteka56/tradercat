"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import { LineChart } from "@mui/x-charts/LineChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import type {
  JournalStats,
  JournalTrade,
  RealizedPoint,
} from "@/lib/queries/journal";
import { usd, usdCompact } from "@/lib/format";

const POS = "#17915f";
const NEG = "#bd4640";
const INK_FAINT = "#8b94a3";

type Tone = "pos" | "neg" | undefined;
const toneColor = (t: Tone) => (t === "pos" ? POS : t === "neg" ? NEG : undefined);

function StatCard({
  label,
  value,
  sub,
  tone,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  spark?: number[];
  sparkColor?: string;
}) {
  const color = toneColor(tone);
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
          sx={{
            mt: 0.5,
            fontSize: 24,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.15,
            color: color ?? "text.primary",
          }}
        >
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
            {sub}
          </Typography>
        )}
        {spark && spark.length > 1 && (
          <Box sx={{ mt: 1, height: 40 }}>
            <SparkLineChart
              data={spark}
              height={40}
              area
              curve="monotoneX"
              sx={{
                "& .MuiLineElement-root": { stroke: sparkColor ?? POS, strokeWidth: 2 },
                "& .MuiAreaElement-root": { fill: sparkColor ?? POS, fillOpacity: 0.14 },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function HomeDashboard({
  name,
  stats,
  series,
  recent,
}: {
  name: string;
  stats: JournalStats;
  series: RealizedPoint[];
  recent: JournalTrade[];
}) {
  const pts = [...series].sort((a, b) => a.t - b.t);
  let cum = 0;
  const equity = pts.map((p) => {
    cum += p.pnl;
    return { t: new Date(p.t), v: cum };
  });
  const up = stats.netPnl >= 0;
  const spark = equity.map((e) => e.v);
  const pfGood = stats.profitFactor != null && stats.profitFactor >= 1;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 2, lg: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>
          {dateStr}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, fontSize: { xs: 26, lg: 30 } }}>
          Welcome back, {name}
        </Typography>
      </Box>

      {/* KPI cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          mb: 2,
        }}
      >
        <StatCard
          label="Net realized P/L"
          value={usd(stats.netPnl, { sign: true })}
          tone={up ? "pos" : "neg"}
          spark={spark}
          sparkColor={up ? POS : NEG}
        />
        <StatCard
          label="Win rate"
          value={`${stats.winRate}%`}
          sub={`${stats.winners}W · ${stats.losers}L`}
        />
        <StatCard
          label="Profit factor"
          value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"}
          tone={stats.profitFactor != null ? (pfGood ? "pos" : "neg") : undefined}
          sub="gross win ÷ gross loss"
        />
        <StatCard
          label="Avg winner"
          value={usd(stats.avgWinner, { sign: true })}
          tone="pos"
          sub={`Avg loser ${usd(stats.avgLoser, { sign: true })}`}
        />
      </Box>

      {/* Equity + recent */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          alignItems: "start",
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontSize: 14 }}>
              Realized P/L
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
              Cumulative across every closed trade
            </Typography>
            {equity.length > 1 ? (
              <LineChart
                height={300}
                margin={{ left: 58, right: 16, top: 12, bottom: 26 }}
                xAxis={[
                  {
                    data: equity.map((e) => e.t),
                    scaleType: "time",
                    valueFormatter: (v: Date) =>
                      v.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  },
                ]}
                yAxis={[{ valueFormatter: (v: number) => usdCompact(v) }]}
                series={[
                  {
                    data: equity.map((e) => e.v),
                    area: true,
                    showMark: false,
                    curve: "monotoneX",
                    color: up ? POS : NEG,
                    valueFormatter: (v) => usd(v ?? 0, { sign: true }),
                  },
                ]}
                grid={{ horizontal: true }}
                sx={{
                  "& .MuiAreaElement-root": { fillOpacity: 0.12 },
                  "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "#e7eaf0" },
                  "& .MuiChartsAxis-tickLabel": { fill: INK_FAINT, fontSize: 11 },
                }}
              />
            ) : (
              <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary", fontSize: 13 }}>
                Your equity curve appears once you have closed trades.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontSize: 14 }}>
              Recent trades
            </Typography>
            <Button
              component={NextLink}
              href="/journal"
              size="small"
              endIcon={<ArrowOutwardRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{ color: "info.main" }}
            >
              View all
            </Button>
          </Box>
          <Divider />
          <List disablePadding>
            {recent.map((t) => {
              const when = t.exitAt ?? t.entryAt;
              const dateLabel = when
                ? new Date(when).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              const win = t.netPnl >= 0;
              return (
                <ListItemButton
                  key={t.id}
                  component={NextLink}
                  href={`/journal/${t.id}`}
                  sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>
                      {t.symbol}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>
                      {dateLabel}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: win ? POS : NEG,
                    }}
                  >
                    {t.incomplete ? "—" : usd(t.netPnl, { sign: true })}
                  </Typography>
                </ListItemButton>
              );
            })}
          </List>
        </Card>
      </Box>
    </Box>
  );
}

/** Simple MUI empty state for accounts with no trades yet. */
export function HomeEmpty() {
  return (
    <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 4, lg: 8 }, maxWidth: 560, mx: "auto" }}>
      <Card>
        <CardContent sx={{ textAlign: "center", py: 5 }}>
          <Typography variant="h6" sx={{ fontSize: 18 }}>
            Let&apos;s build your journal
          </Typography>
          <Typography sx={{ mt: 1, mb: 3, fontSize: 13.5, color: "text.secondary" }}>
            Import your broker&apos;s activity export and TraderCat rebuilds your
            trades from the raw fills.
          </Typography>
          <Button component={NextLink} href="/import" variant="contained" size="large">
            Import trades
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
