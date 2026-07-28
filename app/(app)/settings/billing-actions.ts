"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { stripe, PRICE_ID } from "@/lib/stripe/client";
import { captureError } from "@/lib/observability";

/** Origin for Stripe's success/cancel/return redirects. */
function origin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Get or create the user's Stripe customer, remembering the id. */
async function ensureCustomer(userId: string, email: string): Promise<string> {
  const [sub] = await db
    .select({ customerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (sub?.customerId) return sub.customerId;

  const customer = await stripe!.customers.create({ email, metadata: { userId } });
  await db
    .insert(subscriptions)
    .values({ userId, stripeCustomerId: customer.id })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { stripeCustomerId: customer.id, updatedAt: new Date() },
    });
  return customer.id;
}

/**
 * Start a Checkout for the Pro plan and redirect the user to Stripe. The
 * subscription/entitlement is written by the webhook on completion, not here.
 */
export async function startCheckout() {
  const user = await requireUser();
  if (!stripe) throw new Error("Billing isn't configured.");

  let url: string | null = null;
  try {
    const customerId = await ensureCustomer(user.id, user.email);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin()}/settings?checkout=success`,
      cancel_url: `${origin()}/pricing?checkout=cancelled`,
      subscription_data: { metadata: { userId: user.id } },
    });
    url = session.url;
  } catch (err) {
    captureError(err, { op: "stripe_checkout", userId: user.id });
    throw new Error("Couldn't start checkout. Please try again.");
  }
  if (url) redirect(url);
}

/** Mirror a Stripe subscription onto our row immediately (don't wait on the webhook). */
async function syncFromStripe(userId: string, subId: string) {
  const sub = await stripe!.subscriptions.retrieve(subId);
  await db
    .update(subscriptions)
    .set({
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      priceId: sub.items.data[0]?.price.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

async function currentSubId(userId: string): Promise<string> {
  const [sub] = await db
    .select({ id: subscriptions.stripeSubscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!sub?.id) throw new Error("No active subscription found.");
  return sub.id;
}

/**
 * Cancel at period end — the user keeps what they paid for until the period
 * ends, then it lapses. Done via the API so it happens inside the app, no
 * Stripe portal round-trip. We sync our row right away so the UI updates now.
 */
export async function cancelSubscription() {
  const user = await requireUser();
  if (!stripe) throw new Error("Billing isn't configured.");
  try {
    const subId = await currentSubId(user.id);
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    await syncFromStripe(user.id, subId);
  } catch (err) {
    captureError(err, { op: "stripe_cancel", userId: user.id });
    throw new Error("Couldn't cancel. Please try again.");
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** Undo a pending cancellation — keep the subscription going. */
export async function resumeSubscription() {
  const user = await requireUser();
  if (!stripe) throw new Error("Billing isn't configured.");
  try {
    const subId = await currentSubId(user.id);
    await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
    await syncFromStripe(user.id, subId);
  } catch (err) {
    captureError(err, { op: "stripe_resume", userId: user.id });
    throw new Error("Couldn't resume. Please try again.");
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** Open the Stripe billing portal so the user can manage payment methods. */
export async function openBillingPortal() {
  const user = await requireUser();
  if (!stripe) throw new Error("Billing isn't configured.");

  const [sub] = await db
    .select({ customerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);
  if (!sub?.customerId) redirect("/pricing");

  let url: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.customerId,
      return_url: `${origin()}/settings`,
    });
    url = session.url;
  } catch (err) {
    captureError(err, { op: "stripe_portal", userId: user.id });
    throw new Error("Couldn't open the billing portal.");
  }
  if (url) redirect(url);
}
