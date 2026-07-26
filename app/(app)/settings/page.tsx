import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import {
  ProfileSection,
  TimezoneSection,
  ExportSection,
  DangerSection,
} from "@/components/settings/SettingsSections";

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <main className="px-4 pb-10 pt-14 lg:mx-auto lg:max-w-[640px] lg:pt-10">
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
        Settings
      </h1>
      <p className="mb-5 text-[13px] text-ink-soft">{user.email}</p>

      <div className="space-y-4">
        <ProfileSection initialName={user.displayName ?? ""} />
        <TimezoneSection initial={profile?.timezone ?? "America/New_York"} />
        <ExportSection />
        <DangerSection />
      </div>
    </main>
  );
}
