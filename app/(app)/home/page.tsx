import { HomeDashboard, HomeEmpty } from "@/components/home/HomeDashboard";
import { requireUser } from "@/lib/auth";
import {
  getJournalStats,
  getRealizedSeries,
  getTrades,
} from "@/lib/queries/journal";

export default async function HomePage() {
  const user = await requireUser();
  const [stats, recent, series] = await Promise.all([
    getJournalStats(user.id),
    getTrades(user.id, { limit: 6 }),
    getRealizedSeries(user.id),
  ]);

  const name = user.displayName?.split(" ")[0] ?? "there";

  if (stats.totalTrades === 0) return <HomeEmpty />;

  return (
    <HomeDashboard name={name} stats={stats} series={series} recent={recent} />
  );
}
