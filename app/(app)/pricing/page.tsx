import Link from "next/link";
import { Check } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SubscribeButton, ManageBillingButton } from "@/components/billing/BillingButtons";
import { requireUser } from "@/lib/auth";
import { getEntitlement, TRIAL_DAYS } from "@/lib/subscription";
import { stripeConfigured } from "@/lib/env";

const FEATURES = [
  "Unlimited trade journal & imports",
  "Brokerage sync across 20+ brokers",
  "Full analytics — R-multiple, sessions, overtrading, tags",
  "AI trade reviews on every trade",
  "Your cross-history AI coach",
  "News on your open positions",
];

export default async function PricingPage() {
  const user = await requireUser();
  const ent = await getEntitlement(user);

  return (
    <main className="px-4 pb-12 pt-14 lg:mx-auto lg:max-w-[560px] lg:pt-10">
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
          TraderCat Pro
        </h1>
        <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-ink-soft">
          Everything in TraderCat, one simple plan. Start with a{" "}
          {TRIAL_DAYS}-day free trial — no card required.
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
          {!stripeConfigured ? (
            <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-[12.5px] text-ink-soft">
              Subscriptions aren&apos;t enabled on this environment yet.
            </p>
          ) : ent.isSubscribed && ent.active ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[13px] font-semibold text-pos">
                You&apos;re subscribed — thank you.
              </p>
              <ManageBillingButton />
            </div>
          ) : (
            <>
              <SubscribeButton
                label={ent.status === "trialing" ? "Subscribe now" : "Subscribe to continue"}
              />
              {ent.status === "trialing" && ent.trialDaysLeft != null && (
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
  );
}
