import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";
import { captureError, logEvent } from "@/lib/observability";

/**
 * Stripe webhook — the authority on subscription state. Stripe calls this on
 * every lifecycle event; we verify the signature, then mirror the subscription
 * into our `subscriptions` table so entitlement checks read only our DB.
 *
 * Raw body is required for signature verification, so we read text() and never
 * parse first.
 */
export async function POST(req: Request) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // A bad signature is an attacker or a misconfig — refuse, don't log as ours.
    captureError(err, { op: "stripe_webhook_verify" });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "checkout.session.completed": {
        // The subscription object arrives via its own event too, but pull it
        // now so entitlement flips the moment checkout returns.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
          await syncSubscription(sub);
        }
        break;
      }
      default:
        break; // ignore the rest
    }
  } catch (err) {
    captureError(err, { op: "stripe_webhook_handle", eventType: event.type });
    // 500 tells Stripe to retry — better than dropping a state change.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Map a Stripe Subscription onto our row, keyed by the userId in its metadata. */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Prefer the metadata userId; fall back to the customer id we stored.
  const whereUser = userId
    ? eq(subscriptions.userId, userId)
    : eq(subscriptions.stripeCustomerId, customerId);

  const row = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: sub.items.data[0]?.price.id ?? null,
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  };

  if (userId) {
    await db
      .insert(subscriptions)
      .values({ userId, ...row })
      .onConflictDoUpdate({ target: subscriptions.userId, set: row });
  } else {
    await db.update(subscriptions).set(row).where(whereUser);
  }
  logEvent("subscription_synced", { userId, status: sub.status });
}
