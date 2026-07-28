"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

/** Open the Stripe billing portal so the user can manage or cancel. */
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
