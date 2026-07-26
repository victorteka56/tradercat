"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability";

/**
 * Last-resort boundary — catches errors in the root layout itself, where the
 * normal error.tsx can't reach. Must render its own <html>/<body>. Kept
 * dependency-free (no app CSS is guaranteed here) with inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f7f8fa",
          color: "#14181f",
        }}
      >
        <div style={{ maxWidth: 380, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#59616e", marginTop: 8 }}>
            TraderCat hit an unexpected error. It&apos;s been logged. Try reloading.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              height: 40,
              padding: "0 20px",
              borderRadius: 999,
              border: "none",
              background: "#14181f",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
