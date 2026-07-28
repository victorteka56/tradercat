import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  /** Account creation time — drives the app-level free trial window. */
  createdAt: string;
}

/**
 * The authenticated user, or null. Always uses getUser() (which verifies the
 * JWT with Supabase) rather than getSession(), which trusts the cookie.
 * Cached per-request so multiple callers don't re-verify.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    // Email signups set display_name; OAuth providers (Google) send full_name
    // or name. Read them in that order so every path gets a real greeting.
    displayName:
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
});

/**
 * Use in any server component / action that must not run anonymously.
 * Middleware already redirects, but this is the enforcement that matters —
 * never rely on middleware alone for data access.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
