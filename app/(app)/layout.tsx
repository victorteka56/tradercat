import type { Metadata } from "next";
import { AppShell } from "@/components/nav/AppShell";
import { requireUser } from "@/lib/auth";

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

  return (
    <AppShell displayName={user.displayName} email={user.email}>
      {children}
    </AppShell>
  );
}
