import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware redirects too, but data access must never depend on it alone.
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <Sidebar displayName={user.displayName} email={user.email} />
      <div className="min-w-0 flex-1">
        {/* Phone frame on mobile, wide desktop canvas at lg+ */}
        <div className="mx-auto w-full max-w-[440px] pb-24 lg:max-w-[1160px] lg:px-8 lg:pb-12">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
