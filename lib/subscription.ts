import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripeConfigured } from "@/lib/env";
import type { SessionUser } from "@/lib/auth";

/**
 * Entitlement — the one place that decides whether a user may use the app.
 *
 * The model: every account gets a 14-day free trial of everything (no card),
 * measured from signup. After that they need an active subscription. Stripe
 * state is mirrored into `subscriptions` by the webhook; this reads only our
 * DB, never Stripe live, so it's fast and can't fail on a Stripe hiccup.
 *
 * When billing isn't configured yet (no Stripe keys), access is always granted
 * — so the app runs fully before the keys are in.
 */

export const TRIAL_DAYS = 14;
const DAY = 86_400_000;

export type EntitlementStatus = "active" | "trialing" | "past_due" | "expired" | "off";

export interface Entitlement {
  /** May the user use the app? */
  active: boolean;
  status: EntitlementStatus;
  /** Days remaining in the free trial (only when status === "trialing"). */
  trialDaysLeft: number | null;
  /** Has a real Stripe subscription (paid or in Stripe's own trial). */
  isSubscribed: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export async function getEntitlement(user: SessionUser): Promise<Entitlement> {
  // Billing off → the app is fully open.
  if (!stripeConfigured) {
    return {
      active: true,
      status: "off",
      trialDaysLeft: null,
      isSubscribed: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const periodOk = !periodEnd || periodEnd.getTime() > Date.now();

  // An active or trialing Stripe subscription grants access.
  if (sub && (sub.status === "active" || sub.status === "trialing") && periodOk) {
    return {
      active: true,
      status: sub.status === "trialing" ? "trialing" : "active",
      trialDaysLeft: null,
      isSubscribed: true,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  // A failed payment keeps access briefly so they can fix it, with a warning.
  if (sub && sub.status === "past_due") {
    return {
      active: true,
      status: "past_due",
      trialDaysLeft: null,
      isSubscribed: true,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  // No active subscription → fall back to the app-level free trial.
  const ageMs = Date.now() - new Date(user.createdAt).getTime();
  const daysLeft = Math.ceil((TRIAL_DAYS * DAY - ageMs) / DAY);
  if (daysLeft > 0) {
    return {
      active: true,
      status: "trialing",
      trialDaysLeft: daysLeft,
      isSubscribed: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  // Trial over, nothing active → locked out.
  return {
    active: false,
    status: "expired",
    trialDaysLeft: 0,
    isSubscribed: Boolean(sub?.stripeSubscriptionId),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  };
}
