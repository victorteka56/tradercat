import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for the legal pages. Carries a prominent notice that the text is
 * a starting template, not reviewed advice — so it's never mistaken for vetted
 * counsel. Prose is plain-language and describes the app's actual practices.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[720px] px-5 py-14">
      <Link href="/" className="text-[13px] font-semibold text-info hover:underline">
        ← TraderCat
      </Link>
      <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-[13px] text-ink-faint">Last updated {updated}</p>

      <div className="mt-5 rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
        <strong className="text-ink">Template notice.</strong> This document describes
        TraderCat&apos;s current data practices in plain language, but it is a
        starting point, not legal advice. Have it reviewed by qualified counsel
        before relying on it in production.
      </div>

      <article className="legal mt-6 space-y-5 text-[14px] leading-relaxed text-ink-soft">
        {children}
      </article>
    </main>
  );
}

/** A titled section — keeps the two documents visually consistent. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-[16px] font-semibold text-ink">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
