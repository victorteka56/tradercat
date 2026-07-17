import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function EmptyJournal() {
  return (
    <main className="px-4 pt-14 lg:pt-10">
      <h1 className="mb-4 text-[24px] font-semibold tracking-tight text-ink lg:text-[28px]">
        Journal
      </h1>

      <SurfaceCard className="p-8 text-center lg:mx-auto lg:max-w-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
            <path d="M9 8h6M9 12h6M9 16h3" />
          </svg>
        </div>
        <h2 className="text-[17px] font-semibold text-ink">
          No trades yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-soft">
          Import your broker&apos;s activity export and TraderCat will rebuild
          your trades from the raw fills — P/L, win rate, and what to review.
        </p>
        <Link
          href="/import"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90"
        >
          Import trades
        </Link>
      </SurfaceCard>
    </main>
  );
}
