import NextLink from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { requireUser } from "@/lib/auth";
import { getTrades } from "@/lib/queries/journal";
import type { AnalyticsTrade } from "@/lib/analysis/analytics";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const all = await getTrades(user.id, { limit: 5000 });

  // Ship only what the analytics need — realized trades, minimal fields — so the
  // whole page can filter and recompute client-side per date range.
  const trades: AnalyticsTrade[] = all
    .filter((t) => t.status === "closed" && !t.incomplete)
    .map((t) => ({
      pnl: t.netPnl,
      kind: t.kind,
      direction: t.direction,
      optionType: t.optionType,
      symbol: t.symbol,
      exitMs: t.exitAt ? new Date(t.exitAt).getTime() : null,
      holdingSeconds: t.holdingSeconds,
    }));

  if (trades.length === 0) {
    return (
      <Box sx={{ px: { xs: 2, lg: 4 }, py: { xs: 2, lg: 3 }, maxWidth: 1160, mx: "auto" }}>
        <Typography variant="h4" sx={{ mb: 3, fontSize: { xs: 26, lg: 30 } }}>
          Analytics
        </Typography>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6, maxWidth: 420, mx: "auto" }}>
            <Typography variant="h6" sx={{ fontSize: 17 }}>
              No realized trades yet
            </Typography>
            <Typography sx={{ mt: 1, mb: 3, fontSize: 13.5, color: "text.secondary", lineHeight: 1.6 }}>
              Analytics build from your closed trades. Import a broker export or
              connect your brokerage and they&apos;ll fill in here.
            </Typography>
            <Button component={NextLink} href="/import" variant="contained" size="large">
              Import trades
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <AnalyticsView trades={trades} />;
}
