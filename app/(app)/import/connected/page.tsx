import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { requireUser } from "@/lib/auth";
import { syncBrokerageData } from "@/lib/snaptrade/sync";
import { precomputeReviews } from "@/lib/ai/precompute";

/**
 * Where SnapTrade's portal returns after a connection attempt. We sync
 * immediately so the user lands on real data rather than an empty shell.
 */
export default async function ConnectedPage() {
  const user = await requireUser();

  let outcome: Awaited<ReturnType<typeof syncBrokerageData>> | null = null;
  let error: string | null = null;

  try {
    outcome = await syncBrokerageData(user.id);
    // Kick off review precompute in the background so trades are analysed
    // before the user opens them. Detached — never blocks this page.
    if (outcome.fillsInserted > 0) {
      void precomputeReviews(user.id).catch(() => {});
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not sync your brokerage.";
  }

  const connected = (outcome?.connections ?? 0) > 0;

  return (
    <main className="px-4 pt-14 lg:pt-10">
      <SurfaceCard className="p-8 text-center lg:mx-auto lg:max-w-xl">
        {error ? (
          <>
            <h1 className="text-[18px] font-semibold text-neg">
              Couldn&apos;t finish connecting
            </h1>
            <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
              {error}
            </p>
          </>
        ) : connected ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pos/10 text-[22px] text-pos">
              ✓
            </div>
            <h1 className="text-[18px] font-semibold text-ink">Brokerage connected</h1>
            <p className="tnum mx-auto mt-2 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
              Synced {outcome!.accounts} account
              {outcome!.accounts === 1 ? "" : "s"} and {outcome!.positions} holding
              {outcome!.positions === 1 ? "" : "s"}. Trade history keeps importing in
              the background — it can take a while on the first sync.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[18px] font-semibold text-ink">No connection added</h1>
            <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
              Looks like the connection wasn&apos;t completed. You can try again any
              time.
            </p>
          </>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            href="/portfolio"
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-ink/90"
          >
            View portfolio
          </Link>
          <Link
            href="/import"
            className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-2"
          >
            Back to import
          </Link>
        </div>
      </SurfaceCard>
    </main>
  );
}
