import Link from "next/link";

/**
 * Custom 404 — replaces the bare Next.js default. Hit both by unknown routes
 * and by explicit notFound() calls (e.g. a trade id that isn't the user's).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="tnum text-[40px] font-semibold leading-none tracking-tight text-ink-faint">
          404
        </div>
        <h1 className="mt-3 text-[17px] font-semibold text-ink">Page not found</h1>
        <p className="mx-auto mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-ink-soft">
          That page doesn&apos;t exist, or the trade isn&apos;t one of yours.
        </p>
        <Link
          href="/home"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-ink/90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
