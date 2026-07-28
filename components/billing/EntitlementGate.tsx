"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Entitlement } from "@/lib/subscription";

/**
 * Client gate around the app.
 *
 * - trialing → a slim banner counting down the free trial.
 * - past_due → a warning banner to fix payment.
 * - expired → a hard paywall replaces the page, EXCEPT on Settings and Pricing,
 *   which stay reachable so a locked user can still subscribe, export, or delete.
 *   (`status: "off"` — billing not configured — renders children untouched.)
 */

// Routes a locked user may still reach.
const ALLOWED = ["/settings", "/pricing"];

export function EntitlementGate({
  entitlement,
  children,
}: {
  entitlement: Entitlement;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const allowed = ALLOWED.some((p) => pathname.startsWith(p));

  if (!entitlement.active && !allowed) {
    return <Paywall />;
  }

  return (
    <>
      {entitlement.status === "trialing" && entitlement.trialDaysLeft != null && (
        <TrialBanner days={entitlement.trialDaysLeft} />
      )}
      {entitlement.status === "past_due" && <PastDueBanner />}
      {children}
    </>
  );
}

function TrialBanner({ days }: { days: number }) {
  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-info/25 bg-info/5 px-3.5 py-2 lg:mx-0">
      <span className="text-[12.5px] text-ink">
        <span className="font-semibold">
          {days} {days === 1 ? "day" : "days"} left
        </span>{" "}
        in your free trial.
      </span>
      <Link
        href="/pricing"
        className="text-[12.5px] font-semibold text-info hover:underline"
      >
        Upgrade to Pro →
      </Link>
    </div>
  );
}

function PastDueBanner() {
  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neg/25 bg-neg/5 px-3.5 py-2 lg:mx-0">
      <span className="text-[12.5px] text-ink">
        Your last payment didn&apos;t go through. Update it to keep Pro.
      </span>
      <Link href="/settings" className="text-[12.5px] font-semibold text-neg hover:underline">
        Fix payment →
      </Link>
    </div>
  );
}

function Paywall() {
  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 10V8a6 6 0 0 1 12 0v2m-9 0h6a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-[19px] font-semibold text-ink">Your free trial has ended</h1>
        <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
          Subscribe to keep your journal, analytics, brokerage sync and AI
          reviews. Your data is safe and waiting — you can also export or delete
          it from Settings.
        </p>
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <Link
            href="/pricing"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white hover:bg-ink/90"
          >
            See plans
          </Link>
          <Link
            href="/settings"
            className="text-[12.5px] font-semibold text-ink-soft hover:text-ink"
          >
            Manage account
          </Link>
        </div>
      </div>
    </main>
  );
}
