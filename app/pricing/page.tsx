import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SubscribeButton, ManageBillingButton } from "@/components/billing/BillingButtons";
import { getUser } from "@/lib/auth";
import { getEntitlement, TRIAL_DAYS } from "@/lib/subscription";
import { stripeConfigured } from "@/lib/env";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing — TraderCat",
  description:
    "One plan, everything included. 14-day free trial, no card required, then $19.99/month.",
};

/**
 * Pricing is a PUBLIC page — it's linked from the landing nav, so a logged-out
 * visitor has to be able to read it. Logged out it sells the plan and routes to
 * signup; logged in it becomes the checkout/manage surface the paywall and
 * Settings link to. One page, both jobs, so the URL never dead-ends on a login
 * wall.
 */

const FEATURES = [
  "Unlimited trade journal & imports",
  "Brokerage sync across 20+ brokers",
  "Full analytics — R-multiple, sessions, overtrading, tags",
  "AI trade reviews on every trade",
  "Your cross-history AI coach",
  "News on your open positions",
];

export default async function PricingPage() {
  const user = await getUser();
  const ent = user ? await getEntitlement(user) : null;

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[1060px] items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[14px] font-bold text-white">
            T
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            {SITE_NAME}
          </span>
        </Link>
        {user ? (
          <Link href="/home" className="text-[13.5px] font-semibold text-info">
            Open app →
          </Link>
        ) : (
          <Link href="/login" className="text-[13.5px] font-semibold text-ink-soft hover:text-ink">
            Sign in
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-[560px] px-4 pb-16 pt-8">
        <div className="text-center">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
            TraderCat Pro
          </h1>
          <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-ink-soft">
            One plan, everything included. {TRIAL_DAYS} days free — no card
            required.
          </p>
        </div>

        <SurfaceCard className="mt-6 overflow-hidden">
          <div className="border-b border-line px-6 py-5 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="tnum text-[36px] font-semibold tracking-tight text-ink">
                $19.99
              </span>
              <span className="text-[14px] text-ink-soft">/month</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-faint">Cancel anytime.</p>
          </div>

          <ul className="space-y-2.5 px-6 py-5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pos/12 text-pos">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="text-[13.5px] text-ink">{f}</span>
              </li>
            ))}
          </ul>

          <div className="px-6 pb-6">
            {!user ? (
              <Link
                href="/signup"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-ink/90"
              >
                Start your free trial
              </Link>
            ) : !stripeConfigured ? (
              <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-[12.5px] text-ink-soft">
                Subscriptions aren&apos;t enabled on this environment yet.
              </p>
            ) : ent && ent.isSubscribed && ent.active ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] font-semibold text-pos">
                  You&apos;re subscribed — thank you.
                </p>
                <ManageBillingButton />
              </div>
            ) : (
              <>
                <SubscribeButton
                  label={ent?.status === "trialing" ? "Subscribe now" : "Subscribe to continue"}
                />
                {ent?.status === "trialing" && ent.trialDaysLeft != null && (
                  <p className="mt-2.5 text-center text-[11.5px] text-ink-faint">
                    {ent.trialDaysLeft} {ent.trialDaysLeft === 1 ? "day" : "days"} left
                    in your trial — no charge until you subscribe.
                  </p>
                )}
              </>
            )}
          </div>
        </SurfaceCard>

        <p className="mt-5 text-center text-[12px] text-ink-faint">
          Questions? See our{" "}
          <Link href="/terms" className="font-semibold text-info hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-info hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
