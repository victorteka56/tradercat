"use server";

import { requireUser } from "@/lib/auth";
import { generateAiReview, type ReviewResult } from "@/lib/ai/trade-review";

export type ReviewActionState =
  | { needsData: true }
  | (ReviewResult & { needsData?: false });

/**
 * Called in the background when a trade opens without a cached AI review.
 * Never surfaces an error — it returns the computed review on any failure, so
 * the panel always ends on a solid result.
 *
 * Deliberately does NOT revalidate the route: the client updates its own state
 * with the returned review, and the DB cache serves future loads. Revalidating
 * would re-render the server tree and stomp the client's just-set state (which
 * left the panel stuck on "Refining…").
 */
export async function fetchReview(tradeId: string): Promise<ReviewActionState> {
  const user = await requireUser();
  return generateAiReview(user.id, tradeId);
}
