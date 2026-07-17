import "server-only";

import { Snaptrade } from "snaptrade-typescript-sdk";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snaptradeUsers } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * SnapTrade is server-only. The consumer key and every userSecret stay on the
 * server — the browser never sees either.
 *
 * Heads-up for logging/observability: the SDK sends `userSecret` as a URL query
 * parameter, so raw request URLs must never reach a log sink or error tracker
 * unredacted. AGENTS.md requires token redaction in logs; that applies here.
 */
export const snaptrade = new Snaptrade({
  clientId: env.SNAPTRADE_CLIENT_ID,
  consumerKey: env.SNAPTRADE_CONSUMER_KEY,
});

export interface SnapTradeCreds {
  userId: string;
  userSecret: string;
}

/** Returns stored creds for an app user, or null if they've never registered. */
export async function getCreds(userId: string): Promise<SnapTradeCreds | null> {
  const [row] = await db
    .select()
    .from(snaptradeUsers)
    .where(eq(snaptradeUsers.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.snaptradeUserId,
    userSecret: decryptSecret(row.userSecretEncrypted),
  };
}

/**
 * Registers the app user with SnapTrade (idempotent) and stores the secret
 * encrypted. Our auth.users id doubles as the SnapTrade userId.
 */
export async function ensureCreds(userId: string): Promise<SnapTradeCreds> {
  const existing = await getCreds(userId);
  if (existing) return existing;

  let res;
  try {
    res = await snaptrade.authentication.registerSnapTradeUser({ userId });
  } catch (e) {
    // 1010 = already registered at SnapTrade while we hold no secret locally.
    // The secret is unrecoverable: resetSnapTradeUserSecret needs the *old*
    // secret, and deleting the user would drop their broker connections. So
    // fail loudly rather than silently destroying data.
    const code = (e as { responseBody?: { code?: string } })?.responseBody?.code;
    if (code === "1010") {
      throw new Error(
        "This user already exists at SnapTrade but no local secret is stored. " +
          "The secret cannot be recovered — it must be restored from backup, or " +
          "the SnapTrade user deleted and the brokerage reconnected.",
      );
    }
    throw e;
  }

  const userSecret = res.data?.userSecret;
  if (!userSecret) {
    throw new Error("SnapTrade did not return a userSecret on registration.");
  }

  await db
    .insert(snaptradeUsers)
    .values({
      userId,
      snaptradeUserId: userId,
      userSecretEncrypted: encryptSecret(userSecret),
    })
    .onConflictDoNothing();

  // Re-read: a concurrent request may have won the insert.
  const stored = await getCreds(userId);
  return stored ?? { userId, userSecret };
}

/**
 * Fresh connection-portal URL. These expire quickly, so it is generated
 * just-in-time on click and never cached.
 */
export async function createConnectionPortalUrl(
  userId: string,
  redirectTo: string,
): Promise<string> {
  const creds = await ensureCreds(userId);
  const res = await snaptrade.authentication.loginSnapTradeUser({
    userId: creds.userId,
    userSecret: creds.userSecret,
    customRedirect: redirectTo,
  });
  const uri = (res.data as { redirectURI?: string })?.redirectURI;
  if (!uri) throw new Error("SnapTrade did not return a connection portal URL.");
  return uri;
}
