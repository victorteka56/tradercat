import type { Metadata } from "next";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { EntitlementGate } from "@/components/billing/EntitlementGate";
import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/subscription";

// The authenticated app is private, per-user data — never index it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware redirects too, but data access must never depend on it alone.
  const user = await requireUser();
  const entitlement = await getEntitlement(user);

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <Sidebar displayName={user.displayName} email={user.email} />
      <div className="min-w-0 flex-1">
        {/* Phone frame on mobile, wide desktop canvas at lg+ */}
        <div className="mx-auto w-full max-w-[440px] pb-24 lg:max-w-[1160px] lg:px-8 lg:pb-12">
          {/* Trial banner + hard paywall once the trial ends. Settings and
              Pricing stay reachable so a locked user can still subscribe,
              export, or delete. */}
          <EntitlementGate entitlement={entitlement}>{children}</EntitlementGate>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
