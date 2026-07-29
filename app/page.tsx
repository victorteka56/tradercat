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

        {/* ------------------------------ hero ------------------------------ */}
        {/* Full-bleed on purpose: the chart scenes live OUTSIDE the content
            column so nothing clips at the edges. Layers, bottom-up: chart
            carousel → dark scrim → text. */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* Scene 3 — equity curve (green), slow pan */}
            <div className="tc-scene tc-scene-3 tc-scene-fade">
              <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                className="tc-pan h-full w-full"
                style={{ opacity: 0.55 }}
              >
                <defs>
                  <linearGradient id="eqFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M-60 150 C120 138, 200 176, 300 196 C400 216, 470 250, 580 236 C670 224, 710 178, 800 156 C890 134, 950 156, 1040 128 C1140 96, 1230 72, 1500 40 L1500 320 L-60 320 Z"
                  fill="url(#eqFade)"
                />
                <path
                  d="M-60 150 C120 138, 200 176, 300 196 C400 216, 470 250, 580 236 C670 224, 710 178, 800 156 C890 134, 950 156, 1040 128 C1140 96, 1230 72, 1500 40"
                  fill="none"
                  stroke={GREEN}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            {/* Scene 2 — allocation donut (app palette), very slow spin */}
            <div className="tc-scene tc-scene-2 tc-scene-fade flex items-center justify-center">
              <svg viewBox="0 0 420 420" className="h-[88%] w-auto" style={{ opacity: 0.45 }}>
                <g className="tc-spin">
                  <g transform="rotate(-90 210 210)">
                    <circle cx="210" cy="210" r="110" fill="none" stroke="#5B7FD4" strokeWidth="50" strokeDasharray="242 691" strokeDashoffset="0" />
                    <circle cx="210" cy="210" r="110" fill="none" stroke="#2BC5A8" strokeWidth="50" strokeDasharray="173 691" strokeDashoffset="-242" />
                    <circle cx="210" cy="210" r="110" fill="none" stroke="#D9A441" strokeWidth="50" strokeDasharray="152 691" strokeDashoffset="-415" />
                    <circle cx="210" cy="210" r="110" fill="none" stroke="#8B7BD8" strokeWidth="50" strokeDasharray="124 691" strokeDashoffset="-567" />
                  </g>
                </g>
              </svg>
            </div>

            {/* Scene 1 — monthly columns (violet), bars breathing in stagger */}
            <div className="tc-scene tc-scene-1 tc-scene-fade">
              <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                className="h-full w-full"
                style={{ opacity: 0.42 }}
              >
                {[96, 144, 72, 176, 128, 192, 104, 160, 136, 88, 184, 120, 152, 168].map(
                  (h, i) => (
                    <rect
                      key={i}
                      className="tc-bar"
                      x={i * 103 + 22}
                      y={320 - h}
                      width="52"
                      height={h}
                      rx="7"
                      fill="#8B7BD8"
                      style={{ animationDelay: `${i * 0.35}s` }}
                    />
                  ),
                )}
              </svg>
            </div>

            {/* Scene 4 — running P/L (amber) dipping under a zero line, pan */}
            <div className="tc-scene tc-scene-4 tc-scene-fade">
              <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                className="tc-pan h-full w-full"
                style={{ opacity: 0.5, animationDirection: "alternate-reverse" }}
              >
                <line
                  x1="-60"
                  y1="170"
                  x2="1500"
                  y2="170"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="1"
                  strokeDasharray="6 9"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M300 170 C360 196, 470 220, 640 244 C740 240, 830 196, 880 170 Z"
                  fill="rgba(224,104,95,0.22)"
                />
                <path
                  d="M-60 150 C150 120, 260 200, 380 210 C470 218, 520 250, 640 244 C760 238, 800 170, 900 150 C1000 130, 1100 150, 1200 120 C1300 96, 1380 88, 1500 70"
                  fill="none"
                  stroke="#D9A441"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            {/* The dark veil that keeps the words legible over any scene —
                deepest where the text sits, thinner at the edges so the
                charts still breathe. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 64% 60% at 50% 42%, rgba(10,13,18,0.82), rgba(10,13,18,0.45))",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-[1060px] px-6 py-24 text-center lg:py-36">
            <h1 className="font-display mx-auto max-w-[800px] text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] lg:text-[56px]">
              The journal that
              <br />
              <span
                style={{
                  background: `linear-gradient(100deg, ${GREEN}, #7EE8C0 55%, ${GREEN})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                explains every trade.
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
          </div>
        </section>

        <main className="relative mx-auto max-w-[1060px] px-6">
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
