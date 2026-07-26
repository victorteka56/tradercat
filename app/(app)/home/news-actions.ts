"use server";

import { requireUser } from "@/lib/auth";
import { refreshPositionsNews } from "@/lib/news";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Warms the per-ticker news cache for the caller's open positions and returns
 * the refreshed feed. Called once from the client when the cached feed is stale
 * or empty — the render itself never blocks on an upstream call.
 */
export async function fetchPositionsNews() {
  const user = await requireUser();
  await enforceRateLimit("positions_news", user.id);
  return refreshPositionsNews(user.id);
}
