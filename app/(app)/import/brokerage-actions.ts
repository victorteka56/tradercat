"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createConnectionPortalUrl } from "@/lib/snaptrade/client";
import { disconnectBrokerage, syncBrokerageData } from "@/lib/snaptrade/sync";
import { precomputeReviews } from "@/lib/ai/precompute";

function originFromRequest(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Portal URLs expire quickly, so we mint one per click and redirect straight
 * to it rather than caching or rendering it into the page.
 */
export async function connectBrokerage() {
  const user = await requireUser();
  const url = await createConnectionPortalUrl(
    user.id,
    `${originFromRequest()}/import/connected`,
  );
  redirect(url);
}

export async function syncBrokerage() {
  const user = await requireUser();
  const outcome = await syncBrokerageData(user.id);

  // Precompute reviews for the trades this sync produced, in the background —
  // fire-and-forget so the user's sync returns immediately and the reviews are
  // ready by the time they open a trade. Detached on purpose; in production
  // this moves to a queue.
  if (outcome.fillsInserted > 0) {
    void precomputeReviews(user.id).catch(() => {});
  }

  revalidatePath("/import");
  revalidatePath("/portfolio");
  revalidatePath("/home");
}

export async function removeBrokerage(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("connectionId");
  if (typeof id !== "string") return;
  await disconnectBrokerage(user.id, id);
  revalidatePath("/import");
  revalidatePath("/portfolio");
}
