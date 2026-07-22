import NextLink from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getTradeById, getTradeFills, getTradeNote } from "@/lib/queries/journal";
import { tradeLabel, tradeSubtitle } from "@/lib/trade-display";
import {
  usd,
  holdingLabel,
  dayLabel,
  timeLabel,
  dateTimeLabel,
  hasTimeOfDay,
} from "@/lib/format";
import { SourceBadge } from "@/components/journal/SourceBadge";
import { TradeChartCard } from "@/components/journal/TradeChartCard";
import { ExcursionCard } from "@/components/journal/ExcursionCard";
import { RunningPnlCard } from "@/components/journal/RunningPnlCard";
import { TradeNotesCard } from "@/components/journal/TradeNotesCard";
import { TradeAnalysisDrawer } from "@/components/journal/TradeAnalysisDrawer";
import { getTradeChart, marketDataConfigured } from "@/lib/market/candles";
import { computeExcursions } from "@/lib/analysis/excursions";
import { computeRunningPnl } from "@/lib/analysis/running-pnl";
import { getInitialReview } from "@/lib/ai/trade-review";

const POS = "#17915f";
const NEG = "#bd4640";

export default async function TradeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const trade = await getTradeById(user.id, params.id);
  if (!trade) notFound();

  const [fills, note] = await Promise.all([
    getTradeFills(user.id, trade.id),
    getTradeNote(user.id, trade.id),
  ]);
  const up = trade.netPnl >= 0;

  /**
   * A chart is only honest when we know *when* the trade happened. CSV fills
   * land on midnight, so plotting them would invent precision we don't have.
   */
  const canChart =
    marketDataConfigured && trade.entryAt != null && hasTimeOfDay(trade.entryAt);

  const chart = canChart
    ? await getTradeChart(trade.symbol, trade.entryAt!, trade.exitAt).catch(
        () => null,
      )
    : null;

  // The chart shows the coarser display bars (15min by default); the excursion
  // and running-P/L math below runs on the finer `chart.candles`.
  const chartData = chart
    ? {
        candles: chart.displayCandles.map((c) => ({
          time: Math.floor(c.ts.getTime() / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        })),
        entryPrice: chart.entryPrice,
        exitPrice: chart.exitPrice,
        interval: chart.displayInterval,
        fromMs: chart.from.getTime(),
        toMs: chart.to.getTime(),
      }
    : null;

  // Computed timing metrics (free, deterministic) — the basis for the AI review.
  const excursions =
    chart && chart.entryPrice != null && chart.exitPrice != null && trade.entryAt
      ? computeExcursions(
          chart.candles,
          trade.entryAt,
          trade.exitAt,
          chart.entryPrice,
          chart.exitPrice,
          trade.kind,
          trade.direction,
          trade.optionType,
        )
      : null;

  // The trade's dollar P/L path over the hold — drawdown and run-up. Exact for
  // stocks; an underlying-derived estimate for options (labelled as such).
  const running =
    chart && trade.entryAt && chart.entryPrice != null && chart.exitPrice != null
      ? computeRunningPnl({
          candles: chart.candles,
          entryAt: trade.entryAt,
          exitAt: trade.exitAt,
          kind: trade.kind,
          direction: trade.direction,
          entryUnderlying: chart.entryPrice,
          exitUnderlying: chart.exitPrice,
          avgEntryPrice: trade.avgEntryPrice,
          avgExitPrice: trade.avgExitPrice,
          qty: Math.max(trade.openedQty, trade.closedQty),
          realizedPnl: trade.netPnl,
        })
      : null;

  // Initial review state — no spend. Returns a cached AI review if one exists,
  // otherwise the computed floor, which the client upgrades in the background.
  const initialReview =
    Boolean(env.DEEPSEEK_API_KEY) && excursions
      ? await getInitialReview(user.id, trade.id).catch(() => null)
      : null;

  const isOption = trade.kind === "option";
  const size = Math.round(Math.max(trade.openedQty, trade.closedQty));
  const money2 = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

  // Timing card — the excursion breakdown, or a plain note when there's no
  // intraday history. Sits beside the P/L journey when we have one.
  const timingBlock = excursions ? (
    <ExcursionCard excursions={excursions} symbol={trade.symbol} />
  ) : (
    <Card sx={{ mb: 2, p: 2 }}>
      <Chip label="Timing" size="small" sx={{ mb: 1, bgcolor: "action.hover" }} />
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: "text.secondary" }}>
        Measuring how far {trade.symbol} moved for and against this trade needs
        intraday price history with exact times.{" "}
        {trade.source !== "snaptrade"
          ? "CSV imports don't include times — connect your brokerage."
          : "It isn't available for this trade yet."}
      </Typography>
    </Card>
  );

  const noFillTimes =
    fills.length > 0 && !hasTimeOfDay(fills[0].executedAt);

  return (
    <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 2, lg: 3 }, maxWidth: 1160, mx: "auto" }}>
      <Button
        component={NextLink}
        href="/journal"
        startIcon={<ChevronLeftRoundedIcon />}
        color="inherit"
        sx={{ mb: 1.5, ml: -1, color: "text.secondary", "&:hover": { color: "text.primary" } }}
      >
        Journal
      </Button>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography variant="h4" sx={{ fontSize: { xs: 24, lg: 26 } }}>
              {tradeLabel(trade)}
            </Typography>
            <Chip
              label={trade.direction}
              size="small"
              sx={{
                textTransform: "capitalize",
                fontWeight: 600,
                bgcolor: trade.direction === "long" ? "rgba(23,145,95,0.12)" : "rgba(189,70,64,0.12)",
                color: trade.direction === "long" ? POS : NEG,
              }}
            />
            <SourceBadge trade={trade} />
            {trade.status === "open" && (
              <Chip label="Open" size="small" color="info" variant="outlined" />
            )}
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: 13, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            {tradeSubtitle(trade)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: up ? POS : NEG }}>
            {usd(trade.netPnl, { sign: true })}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>realized</Typography>
        </Box>
      </Box>

      {/* The glowing AI analysis launcher — opens the panel from the right. */}
      {env.DEEPSEEK_API_KEY && initialReview && !("needsData" in initialReview) ? (
        <TradeAnalysisDrawer
          tradeId={trade.id}
          initial={initialReview.review}
          initialKind={initialReview.kind}
          trade={{
            symbol: trade.symbol,
            netPnl: trade.netPnl,
            pnlPct: trade.pnlPct,
            incomplete: trade.incomplete,
            held:
              trade.holdingSeconds != null && hasTimeOfDay(trade.entryAt)
                ? holdingLabel(trade.holdingSeconds)
                : null,
          }}
          run={
            running
              ? {
                  peak: running.peak.pnl,
                  trough: running.trough.pnl,
                  maxDrawdown: running.maxDrawdown,
                  giveback: running.giveback,
                  timeUnderwaterPct: running.timeUnderwaterPct,
                  estimated: running.estimated,
                }
              : null
          }
          exc={
            excursions
              ? {
                  favorable: excursions.favorableExcursionPct,
                  adverse: excursions.adverseExcursionPct,
                  captured: excursions.capturedPct,
                  netMove: excursions.netMovePct,
                  directionCorrect: excursions.directionCorrect,
                }
              : null
          }
        />
      ) : env.DEEPSEEK_API_KEY ? null : (
        <Card sx={{ mb: 2, p: 2 }}>
          <Chip label="Trade analysis" size="small" sx={{ mb: 1, bgcolor: "action.hover" }} />
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: "text.secondary" }}>
            Plain-English analysis of each trade. Add a DeepSeek API key to enable it.
          </Typography>
        </Card>
      )}

      {/* Mosaic — chart + P/L journey on the left, the numbers on the right. */}
      <Box sx={{ display: { lg: "grid" }, gridTemplateColumns: { lg: "1.7fr 1fr" }, gap: 2.5, alignItems: "start" }}>
        <Box sx={{ minWidth: 0 }}>
          <TradeChartCard trade={trade} data={chartData} marketDataConfigured={marketDataConfigured} />
          {running && <RunningPnlCard data={running} symbol={trade.symbol} />}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Card sx={{ mb: 2, px: 2 }}>
            <StatRow label="Net ROI" value={trade.pnlPct == null ? "—" : `${trade.pnlPct >= 0 ? "+" : ""}${trade.pnlPct.toFixed(1)}%`} tone={trade.pnlPct == null ? undefined : trade.pnlPct >= 0 ? "pos" : "neg"} />
            <StatRow label="Gross P/L" value={usd(trade.grossPnl ?? trade.netPnl, { sign: true })} />
            <StatRow label="Fees" value={usd(trade.fees)} />
            <StatRow label="Cost basis" value={usd(trade.cost)} />
            <StatRow label="Proceeds" value={usd(trade.proceeds)} />
            <StatRow label="Side" value={trade.direction === "long" ? "Long" : "Short"} />
            <StatRow label={isOption ? "Contracts" : "Shares"} value={size > 0 ? size.toLocaleString() : "—"} />
            <StatRow
              label="R-multiple"
              value={trade.rMultiple != null && trade.riskSource ? `${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}R` : "Not set"}
              tone={trade.rMultiple != null && trade.riskSource ? (trade.rMultiple >= 0 ? "pos" : "neg") : undefined}
              muted={!(trade.rMultiple != null && trade.riskSource)}
            />
            <StatRow label="Avg entry" value={money2(trade.avgEntryPrice)} />
            <StatRow label="Avg exit" value={money2(trade.avgExitPrice)} />
            <StatRow label="Held" value={trade.holdingSeconds != null && hasTimeOfDay(trade.entryAt) ? holdingLabel(trade.holdingSeconds) : "—"} />
            <StatRow label="Account" value={trade.brokerName ?? "CSV import"} />
            <StatRow label="Opened" value={dayLabel(trade.entryAt)} sub={timeLabel(trade.entryAt)} />
            <StatRow label="Closed" value={dayLabel(trade.exitAt)} sub={timeLabel(trade.exitAt)} last />
          </Card>
          {timingBlock}
        </Box>
      </Box>

      <TradeNotesCard tradeId={trade.id} initial={note} />

      <Box sx={{ mb: 1, px: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.disabled" }}>
          Fills ({fills.length})
        </Typography>
        {noFillTimes && (
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
            · CSV exports don&apos;t include times
          </Typography>
        )}
      </Box>
      <Card sx={{ mb: 3, overflow: "hidden" }}>
        {fills.map((f, i) => (
          <Box
            key={f.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.25,
              borderBottom: i < fills.length - 1 ? "1px solid" : 0,
              borderColor: "divider",
            }}
          >
            <Typography sx={{ width: 48, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "text.secondary" }}>
              {f.code}
            </Typography>
            <Typography sx={{ flexGrow: 1, fontSize: 12, color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
              {dateTimeLabel(f.executedAt)}
            </Typography>
            <Typography sx={{ width: 48, textAlign: "right", fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {f.quantity}
            </Typography>
            <Typography sx={{ width: 64, textAlign: "right", fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {f.price != null ? `$${f.price}` : "—"}
            </Typography>
            <Typography sx={{ width: 96, textAlign: "right", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: f.amount >= 0 ? POS : NEG }}>
              {usd(f.amount, { sign: true })}
            </Typography>
          </Box>
        ))}
      </Card>
    </Box>
  );
}

function StatRow({
  label,
  value,
  sub,
  tone,
  muted,
  last,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: "pos" | "neg";
  muted?: boolean;
  last?: boolean;
}) {
  const color = tone === "pos" ? POS : tone === "neg" ? NEG : muted ? "text.disabled" : "text.primary";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        py: 1.25,
        borderBottom: last ? 0 : "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography sx={{ flexShrink: 0, fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, textAlign: "right" }}>
        <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color }}>
          {value}
        </Typography>
        {sub && (
          <Typography component="span" sx={{ ml: 0.75, fontSize: 11, color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
