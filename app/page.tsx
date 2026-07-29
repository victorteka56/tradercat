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
          {/* Hairline horizon under the hero */}
          <div
            className="absolute left-1/2 top-[640px] h-px w-[min(1000px,90vw)] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
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
          <section className="pt-14 text-center lg:pt-24">
            <p
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-wide"
              style={{
                color: SOFT,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
              />
              Now in open beta
            </p>

            <h1
              className="font-display mx-auto max-w-[680px] text-[44px] font-semibold leading-[1.04] tracking-[-0.02em] lg:text-[72px]"
            >
              Every trade,
              <br />
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
              className="mx-auto mt-6 max-w-[440px] text-[15.5px] leading-relaxed lg:text-[16.5px]"
              style={{ color: SOFT }}
            >
              Connect your broker and see what&apos;s making you money, what&apos;s
              quietly costing you — and the habits behind both.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          </section>

          {/* --------------------------- product hint -------------------------- */}
          <section className="mx-auto mt-16 max-w-[760px] lg:mt-20" aria-hidden>
            <div className="tc-glass rounded-3xl p-5 lg:p-7">
              {/* Equity curve — a real shape (drawdown sat through, then the
                  recovery) drawn once, glowing once. */}
              <svg viewBox="0 0 640 190" className="w-full" role="img" aria-label="">
                <defs>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity="0.18" />
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
                  d="M8 96 C60 88, 96 110, 140 120 C190 132, 216 150, 262 142 C300 136, 318 108, 356 96 C398 82, 420 96, 458 78 C500 57, 530 44, 632 30"
                  fill="none"
                  stroke={GREEN}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
                <path
                  className="tc-after-draw"
                  d="M8 96 C60 88, 96 110, 140 120 C190 132, 216 150, 262 142 C300 136, 318 108, 356 96 C398 82, 420 96, 458 78 C500 57, 530 44, 632 30 L632 190 L8 190 Z"
                  fill="url(#fade)"
                />
                <g className="tc-after-draw">
                  <circle cx="262" cy="142" r="4" fill={INK} stroke={GREEN} strokeWidth="2" />
                  <circle className="tc-dot-pulse" cx="632" cy="30" r="4" fill={GREEN} />
                  <text x="252" y="168" fontSize="11" fill={FAINT} fontFamily="inherit">
                    the drawdown you sat through
                  </text>
                </g>
              </svg>

              {/* One line of the product's voice — violet only whispers here. */}
              <div
                className="mt-4 flex items-start gap-3 rounded-2xl px-4 py-3.5"
                style={{
                  background: "rgba(139,92,246,0.07)",
                  border: "1px solid rgba(139,92,246,0.18)",
                }}
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "#8B5CF6", boxShadow: "0 0 10px rgba(139,92,246,0.8)" }}
                />
                <p className="text-[13.5px] leading-relaxed" style={{ color: TEXT }}>
                  You sat through a $1,240 drawdown before this paid — the win was
                  real, but the risk that bought it was bigger than it looks.
                </p>
              </div>
            </div>
          </section>

          {/* ----------------------------- features ---------------------------- */}
          <section className="mx-auto max-w-[880px] py-20 lg:py-24">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <div key={f.title}>
                  <div
                    className="text-[11px] font-semibold tracking-[0.14em]"
                    style={{ color: GREEN }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-display mt-2 text-[19px] font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: SOFT }}>
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="mt-14 text-center text-[12.5px] tracking-wide"
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
