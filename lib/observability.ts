/**
 * One place to report errors and events.
 *
 * Today it emits structured JSON to stdout/stderr — which Vercel (and most
 * hosts) capture and index — so failures are searchable instead of silent.
 * It's deliberately dependency-free and isomorphic (safe on server and client),
 * with a single seam (`sink`) to forward into Sentry/Datadog later without
 * touching a single call site.
 *
 * Secrets are redacted before anything is logged — the SnapTrade SDK is known
 * to put `userSecret` in places that could otherwise leak into a log line.
 */

type Ctx = Record<string, unknown>;

const REDACT = /secret|token|password|api[_-]?key|authorization|cookie|userSecret/i;

/** Shallow-redact obviously sensitive keys so they never reach a log sink. */
function scrub(ctx: Ctx | undefined): Ctx | undefined {
  if (!ctx) return undefined;
  const out: Ctx = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = REDACT.test(k) ? "[redacted]" : v;
  }
  return out;
}

const isServer = typeof window === "undefined";
const env = process.env.NODE_ENV;

/** The forwarding seam. Swap this for Sentry.captureException etc. later. */
function sink(level: "error" | "warn" | "info", payload: Record<string, unknown>) {
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/**
 * Report a caught error. `context` is a short snake_case-ish bag of extras
 * (ids, the operation name) — never raw secrets; they're scrubbed regardless.
 */
export function captureError(err: unknown, context?: Ctx): void {
  const e =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { name: "NonError", message: String(err) };

  sink("error", {
    kind: "error",
    at: isServer ? "server" : "client",
    env,
    error: e,
    context: scrub(context),
  });
}

/** A named operational event (a sync completed, a quota was hit, …). */
export function logEvent(name: string, data?: Ctx): void {
  sink("info", { kind: "event", at: isServer ? "server" : "client", env, name, data: scrub(data) });
}
