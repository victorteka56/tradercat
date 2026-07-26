import "server-only";

import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { logEvent } from "@/lib/observability";

/**
 * A small fixed-window rate limiter backed by Postgres.
 *
 * Each caller gets a bucket keyed by action + identity + the current time
 * window; a single atomic upsert increments it and tells us the new count in
 * one round trip, so it's correct even across concurrent serverless instances.
 * Precise token-bucket fairness isn't the goal — cheap abuse/cost protection
 * on the expensive endpoints (AI, broker sync, market data) is.
 */

export interface RateLimit {
  /** max calls allowed within the window */
  limit: number;
  /** window length in ms */
  windowMs: number;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** ms until the window resets (only meaningful when !ok) */
  retryAfterMs: number;
}

/** Named limits per action — one place to tune the knobs. */
export const LIMITS = {
  ai_trade_review: { limit: 30, windowMs: 60_000 },
  ai_coach: { limit: 10, windowMs: 60_000 },
  brokerage_sync: { limit: 6, windowMs: 60_000 },
  positions_news: { limit: 12, windowMs: 60_000 },
} as const satisfies Record<string, RateLimit>;

export type RateAction = keyof typeof LIMITS;

/**
 * Consume one unit for (action, identity). Returns ok=false once the window's
 * limit is exceeded. Fails OPEN — if the limiter query itself errors we allow
 * the call rather than lock users out over an infra hiccup.
 */
export async function rateLimit(action: RateAction, identity: string): Promise<RateResult> {
  const { limit, windowMs } = LIMITS[action];
  const now = Date.now();
  const windowIndex = Math.floor(now / windowMs);
  const bucket = `${action}:${identity}:${windowIndex}`;
  const expiresAt = new Date((windowIndex + 1) * windowMs);

  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ bucket, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateLimits.bucket,
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });

    const count = row?.count ?? 1;

    // Sweep expired rows now and then so the table can't grow unbounded.
    if (count % 20 === 0) {
      await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date())).catch(() => {});
    }

    if (count > limit) {
      logEvent("rate_limited", { action, identity, count, limit });
      return { ok: false, remaining: 0, retryAfterMs: expiresAt.getTime() - now };
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfterMs: 0 };
  } catch {
    // Fail open — never block a user because the limiter had a bad day.
    return { ok: true, remaining: limit, retryAfterMs: 0 };
  }
}

/** Thrown to the client when a limit is hit — carries a friendly, actionable message. */
export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    const secs = Math.ceil(retryAfterMs / 1000);
    super(`You're doing that a lot. Try again in ${secs}s.`);
    this.name = "RateLimitError";
  }
}

/** Convenience: enforce a limit, throwing RateLimitError when exceeded. */
export async function enforceRateLimit(action: RateAction, identity: string): Promise<void> {
  const r = await rateLimit(action, identity);
  if (!r.ok) throw new RateLimitError(r.retryAfterMs);
}
