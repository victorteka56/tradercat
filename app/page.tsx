import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FAQ, SITE_NAME, jsonLd } from "@/lib/seo";

/**
 * The landing page. Deliberately dark — the one surface where the product gets
 * to be theatrical — while the app itself stays light. Two rules hold it
 * together: almost no copy (the app explains itself; this page seduces), and
 * exactly one colour allowed to glow (the brand green; violet only as a
 * whisper behind the AI line). Everything else is hairline glass on near-black.
 */

const INK = "#0A0D12";
const TEXT = "#EDF1F5";
const SOFT = "#98A2B3";
const FAINT = "#5B6472";
const GREEN = "#2BD68F";

const FEATURES = [
  { title: "Rebuilt", body: "Raw broker fills become clean trades, automatically." },
  { title: "Charted", body: "Entry to exit, on the price that made the trade." },
  { title: "Reviewed", body: "Plain-English reviews, grounded in your numbers." },
  { title: "Understood", body: "The habits behind your P/L, laid bare." },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <div
        className="relative min-h-screen overflow-hidden antialiased"
        style={{ background: INK, color: TEXT }}
      >
        {/* Aurora — one green bloom, one faint violet. Blurred far past
            recognisability so they read as light, not shapes. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Drifting dot grid — texture, not spectacle. Wrapper owns the mask
              so the fade stays put while the grid slides beneath it. */}
          <div className="tc-grid-mask absolute inset-x-0 top-0 h-[760px]">
            <div className="tc-grid" />
          </div>
          <div
            className="tc-aurora absolute left-1/2 top-[-260px] h-[560px] w-[820px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(43,214,143,0.19), rgba(43,214,143,0.07) 45%, transparent 72%)",
            }}
          />
          <div
            className="tc-aurora tc-aurora-slow absolute right-[-180px] top-[220px] h-[420px] w-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(139,92,246,0.13), rgba(139,92,246,0.04) 45%, transparent 72%)",
            }}
          />
          <div
            className="tc-aurora tc-aurora-slow absolute left-[-140px] top-[560px] h-[360px] w-[440px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(43,214,143,0.08), transparent 70%)",
              animationDelay: "-7s",
            }}
          />
        </div>

        <header className="relative mx-auto flex max-w-[1060px] items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold"
              style={{ background: TEXT, color: INK }}
            >
              T
            </div>
            <span className="text-[15px] font-semibold tracking-tight">{SITE_NAME}</span>
          </div>
          <nav className="flex items-center gap-1.5">
            <Link
              href="/pricing"
              className="hidden rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors hover:text-white sm:inline-flex"
              style={{ color: SOFT }}
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              className="hidden rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors hover:text-white sm:inline-flex"
              style={{ color: SOFT }}
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors hover:text-white"
              style={{ color: SOFT }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full px-4 py-2 text-[13.5px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: TEXT, color: INK }}
            >
              Get started
            </Link>
          </nav>
        </header>

        <main className="relative mx-auto max-w-[1060px] px-6">
          {/* ------------------------------ hero ------------------------------ */}
          <section className="relative pb-40 pt-20 text-center lg:pb-56 lg:pt-28">
            <h1 className="font-display mx-auto max-w-[800px] text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] lg:text-[56px]">
              Every trade,
              <br className="lg:hidden" />{" "}
              <span
                style={{
                  background: `linear-gradient(100deg, ${GREEN}, #7EE8C0 55%, ${GREEN})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                explained.
              </span>
            </h1>

            <p
              className="mx-auto mt-5 max-w-[420px] text-[15px] leading-relaxed lg:text-[16px]"
              style={{ color: SOFT }}
            >
              See what&apos;s working. Fix what&apos;s quietly costing you.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="tc-neon-cta inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold"
                style={{ background: GREEN, color: "#052A1C" }}
              >
                Start free <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full px-7 text-[15px] font-medium transition-colors hover:text-white"
                style={{ color: SOFT }}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-[12px]" style={{ color: FAINT }}>
              14-day free trial · no card required
            </p>

            {/* Ambient chart — the app's equity curve as a transparent layer,
                not a boxed widget. Full-bleed, drawn in once, breathing dot.
                No border, no chip, no label: background, not exhibit. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[-24px] bottom-0 h-[220px] lg:h-[320px]"
            >
              <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity="0.14" />
                    <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-40%" width="140%" height="180%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  className="tc-draw"
                  pathLength={1}
                  d="M0 150 C120 138, 200 176, 300 196 C400 216, 470 250, 580 236 C670 224, 710 178, 800 156 C890 134, 950 156, 1040 128 C1140 96, 1230 72, 1440 40"
                  fill="none"
                  stroke={GREEN}
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="tc-after-draw"
                  d="M0 150 C120 138, 200 176, 300 196 C400 216, 470 250, 580 236 C670 224, 710 178, 800 156 C890 134, 950 156, 1040 128 C1140 96, 1230 72, 1440 40 L1440 320 L0 320 Z"
                  fill="url(#fade)"
                />
                <g className="tc-after-draw">
                  <circle cx="580" cy="236" r="3.5" fill={INK} stroke={GREEN} strokeWidth="2" />
                </g>
              </svg>
            </div>
          </section>

          {/* ----------------------------- features ---------------------------- */}
          <section className="mx-auto max-w-[880px] py-16 lg:py-20">
            <ul
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-[13.5px]"
              style={{ color: SOFT }}
            >
              {[
                "Rebuilds every fill",
                "Charts every trade",
                "Reviews in plain English",
                "Finds the habits behind your P/L",
              ].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  {i > 0 && (
                    <span
                      className="hidden h-1 w-1 rounded-full md:block"
                      style={{ background: "rgba(255,255,255,0.22)" }}
                    />
                  )}
                  {t}
                </li>
              ))}
            </ul>
            <p
              className="mt-6 text-center text-[12px] tracking-wide"
              style={{ color: FAINT }}
            >
              Read-only broker access &nbsp;·&nbsp; Encrypted &nbsp;·&nbsp; Export
              anytime
            </p>
          </section>

          {/* ------------------------------- FAQ ------------------------------- */}
          <section
            id="faq"
            className="mx-auto max-w-[640px] scroll-mt-24 pb-20"
            aria-labelledby="faq-heading"
          >
            <h2
              id="faq-heading"
              className="font-display text-center text-[24px] font-medium tracking-tight"
            >
              Questions
            </h2>
            <div className="mt-8 space-y-2.5">
              {FAQ.map((f) => (
                <details key={f.q} className="tc-glass group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      className="text-[18px] leading-none transition-transform group-open:rotate-45"
                      style={{ color: FAINT }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: SOFT }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ------------------------------- CTA ------------------------------- */}
          <section className="pb-24 text-center">
            <h2 className="font-display mx-auto max-w-[480px] text-[28px] font-medium leading-snug tracking-tight lg:text-[34px]">
              See what your trading has been telling you.
            </h2>
            <Link
              href="/signup"
              className="tc-neon-cta mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold"
              style={{ background: GREEN, color: "#052A1C" }}
            >
              Start free <ArrowRight size={17} />
            </Link>
          </section>
        </main>

        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div
            className="mx-auto flex max-w-[1060px] flex-col items-center justify-between gap-3 px-6 py-8 text-[13px] sm:flex-row"
            style={{ color: FAINT }}
          >
            <span>
              © {new Date().getFullYear()} {SITE_NAME}
            </span>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
              <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
