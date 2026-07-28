import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "./client";
import { captureError } from "@/lib/observability";

/**
 * Pull a user's current subscription straight from Stripe and mirror it into our
 * row. This is the belt to the webhook's suspenders: webhooks can be delayed,
 * dropped, or (in local dev) not forwarded at all, so we also reconcile on the
 * checkout-success return — the moment the user is looking for their upgrade to
 * take effect. Safe to call anytime; a no-op when billing is off or there's no
 * customer yet.
 */
export async function reconcileSubscription(userId: string): Promise<void> {
  if (!stripe) return;

  try {
    const [row] = await db
      .select({ customerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (!row?.customerId) return;

    const subs = await stripe.subscriptions.list({
      customer: row.customerId,
      status: "all",
      limit: 10,
    });
    if (subs.data.length === 0) return;

    // Prefer a live subscription; otherwise the most recent (e.g. canceled).
    const current =
      subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ??
      subs.data[0];

    await db
      .update(subscriptions)
      .set({
        stripeSubscriptionId: current.id,
        status: current.status,
        priceId: current.items.data[0]?.price.id ?? null,
        currentPeriodEnd: new Date(current.current_period_end * 1000),
        cancelAtPeriodEnd: current.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } catch (err) {
    // Best-effort — the webhook is still the primary path; never break the page.
    captureError(err, { op: "stripe_reconcile", userId });
  }
}
