"use client";

import { useState } from "react";
import { startCheckout, openBillingPortal } from "@/app/(app)/settings/billing-actions";

/** Kicks off Stripe Checkout; the action redirects, so this just shows a pending state. */
export function SubscribeButton({
  label = "Start subscription",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() => {
          setBusy(true);
          setError(null);
          startCheckout().catch((e) => {
            setError(e instanceof Error ? e.message : "Something went wrong.");
            setBusy(false);
          });
        }}
        disabled={busy}
        className={
          className ??
          "inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
        }
      >
        {busy ? "Redirecting…" : label}
      </button>
      {error && <p className="mt-2 text-center text-[11.5px] text-neg">{error}</p>}
    </div>
  );
}

/** Opens the Stripe billing portal to manage or cancel. */
export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        openBillingPortal().catch(() => setBusy(false));
      }}
      disabled={busy}
      className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:border-ink/25 disabled:opacity-50"
    >
      {busy ? "Opening…" : "Manage subscription"}
    </button>
  );
}
