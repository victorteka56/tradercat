"use server";

import { requireUser } from "@/lib/auth";
import { refreshCoachSummary } from "@/lib/ai/coach";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Generate (or refresh) the cross-history coach summary and cache it. Called
 * once from the client when the served summary is the computed floor, so the
 * page render itself never blocks on an AI call.
 */
export async function fetchCoachSummary() {
  const user = await requireUser();
  await enforceRateLimit("ai_coach", user.id);
  return refreshCoachSummary(user.id);
}
