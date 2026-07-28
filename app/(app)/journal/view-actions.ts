"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type JournalView = "table" | "calendar";

/** Persists the journal layout choice to the user's profile. */
export async function setJournalView(view: JournalView): Promise<void> {
  const user = await requireUser();
  await db
    .update(profiles)
    .set({ journalView: view, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));
  revalidatePath("/journal");
}

export async function getJournalView(userId: string): Promise<JournalView> {
  const [p] = await db
    .select({ v: profiles.journalView })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return p?.v === "calendar" ? "calendar" : "table";
}
