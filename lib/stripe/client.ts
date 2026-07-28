import "server-only";

import Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";

/**
 * The Stripe SDK, or null when billing isn't configured (no secret key). Every
 * caller must handle null — that's the "billing is off, everyone's on the free
 * trial" state, so the app runs fine before Stripe keys are added.
 */
export const stripe: Stripe | null = stripeConfigured
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

export const PRICE_ID = env.STRIPE_PRICE_ID;
