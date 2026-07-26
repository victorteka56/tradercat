import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTrades } from "@/lib/queries/journal";
import { hasTimeOfDay } from "@/lib/format";
import type { AnalyticsTrade } from "@/lib/analysis/analytics";
import { DimensionDetail, type DetailView } from "@/components/analytics/DimensionDetail";

const VIEWS: DetailView[] = ["type", "direction", "days", "hold", "symbols", "activity"];

export default async function AnalyticsDetailPage({
  params,
}: {
  params: { view: string };
}) {
  if (!VIEWS.includes(params.view as DetailView)) notFound();

  const user = await requireUser();
  const all = await getTrades(user.id, { limit: 5000 });
  const trades: AnalyticsTrade[] = all
    .filter((t) => t.status === "closed" && !t.incomplete)
    .map((t) => ({
      pnl: t.netPnl,
      kind: t.kind,
      direction: t.direction,
      optionType: t.optionType,
      symbol: t.symbol,
      exitMs: t.exitAt ? new Date(t.exitAt).getTime() : null,
      entryMs: t.entryAt ? new Date(t.entryAt).getTime() : null,
      entryHasTime: hasTimeOfDay(t.entryAt),
      holdingSeconds: t.holdingSeconds,
      rMultiple: t.rMultiple,
    }));

  return <DimensionDetail view={params.view as DetailView} trades={trades} />;
}
