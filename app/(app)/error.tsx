"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError } from "@/lib/observability";

/**
 * Segment error boundary for the whole authed app. Any uncaught error in a
 * page or its data loading lands here instead of the raw Next.js overlay —
 * the user gets a way back, and the failure is reported.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "app-segment", digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="text-[18px] font-semibold text-ink">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-ink-soft">
          That page hit an error. It&apos;s been logged — try again, or head back to
          your dashboard.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-ink/90"
          >
            Try again
          </button>
          <Link
            href="/home"
            className="inline-flex h-10 items-center justify-center rounded-full border border-line px-5 text-[13.5px] font-semibold text-ink-soft hover:text-ink"
          >
            Go home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-[10.5px] text-ink-faint">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
