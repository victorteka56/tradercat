"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startCheckout,
  openBillingPortal,
  cancelSubscription,
  resumeSubscription,
} from "@/app/(app)/settings/billing-actions";

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

/** Opens the Stripe billing portal — for updating the payment method. */
export function ManageBillingButton({ label = "Update payment method" }: { label?: string }) {
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
      {busy ? "Opening…" : label}
    </button>
  );
}

/**
 * In-app cancel / resume — no Stripe portal round-trip. Cancel is a two-step
 * confirm (it's a real decision); resume is one click. Both sync immediately.
 */
export function CancelResumeControls({ cancelling }: { cancelling: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    fn()
      .then(() => {
        setConfirming(false);
        router.refresh();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."))
      .finally(() => setBusy(false));
  };

  if (cancelling) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run(resumeSubscription)}
          disabled={busy}
          className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {busy ? "…" : "Resume subscription"}
        </button>
        {error && <span className="text-[11.5px] text-neg">{error}</span>}
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-[12.5px] font-medium text-ink-faint hover:text-neg"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-surface-2/50 p-3">
      <p className="text-[12.5px] text-ink">
        Cancel at the end of your billing period? You&apos;ll keep Pro until then.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => run(cancelSubscription)}
          disabled={busy}
          className="rounded-lg border border-neg/30 bg-neg/5 px-3.5 py-1.5 text-[12.5px] font-semibold text-neg hover:bg-neg/10 disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
        >
          Keep it
        </button>
      </div>
      {error && <p className="text-[11.5px] text-neg">{error}</p>}
    </div>
  );
}
