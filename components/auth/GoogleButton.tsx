"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * "Continue with Google" — Supabase OAuth with the PKCE flow. The redirect
 * lands on /auth/callback (which already exchanges the code) and honours the
 * same ?next= the password form uses, so both paths resume identically.
 */
export function GoogleButton({ next = "/home" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // On success the browser navigates away; only failures land here.
    if (error) {
      setError("Couldn't reach Google. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
            fill="#4285F4"
          />
          <path
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
            fill="#34A853"
          />
          <path
            d="M5.28 14.29a7.21 7.21 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z"
            fill="#FBBC05"
          />
          <path
            d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
            fill="#EA4335"
          />
        </svg>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-[12px] text-neg">{error}</p>}
    </div>
  );
}

/** The thin "or" rule between Google and the email form. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11.5px] font-medium uppercase tracking-wide text-ink-faint">
        or
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
