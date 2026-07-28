import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/subscription";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  ManageBillingButton,
  CancelResumeControls,
} from "@/components/billing/BillingButtons";
import {
  ProfileSection,
  TimezoneSection,
  ExportSection,
  DangerSection,
} from "@/components/settings/SettingsSections";

const fmtDate = (d: Date | null): string =>
  d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const ent = await getEntitlement(user);

  return (
    <main className="px-4 pb-10 pt-14 lg:mx-auto lg:max-w-[640px] lg:pt-10">
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
        Settings
      </h1>
      <p className="mb-5 text-[13px] text-ink-soft">{user.email}</p>

      <div className="space-y-4">
        {ent.status !== "off" && (
          <SurfaceCard className="p-5">
            <h2 className="text-[14px] font-semibold text-ink">Subscription</h2>
            <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">
              {ent.status === "active" &&
                (ent.cancelAtPeriodEnd
                  ? `Pro — cancels on ${fmtDate(ent.currentPeriodEnd)}. You keep access until then.`
                  : `Pro — active. Renews ${fmtDate(ent.currentPeriodEnd)}.`)}
              {ent.status === "trialing" &&
                (ent.isSubscribed
                  ? "Pro — in trial."
                  : `Free trial — ${ent.trialDaysLeft} ${ent.trialDaysLeft === 1 ? "day" : "days"} left.`)}
              {ent.status === "past_due" && "Payment failed — update it to keep Pro."}
              {ent.status === "expired" && "Your trial has ended."}
            </p>

            {ent.isSubscribed ? (
              <div className="flex flex-col gap-3">
                <CancelResumeControls cancelling={ent.cancelAtPeriodEnd} />
                <ManageBillingButton />
              </div>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/90"
              >
                {ent.status === "expired" ? "Subscribe" : "Upgrade to Pro"}
              </Link>
            )}
          </SurfaceCard>
        )}

        <ProfileSection initialName={user.displayName ?? ""} />
        <TimezoneSection initial={profile?.timezone ?? "America/New_York"} />
        <ExportSection />
        <DangerSection />
      </div>
    </main>
  );
}
