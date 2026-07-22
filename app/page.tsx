import Link from "next/link";
import {
  Combine,
  LineChart,
  MessageSquareText,
  BarChart3,
  Activity,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { FAQ, SITE_NAME, SITE_DESCRIPTION, jsonLd } from "@/lib/seo";

const FEATURES = [
  {
    Icon: Combine,
    title: "Automatic trade reconstruction",
    body: "Import a CSV or connect your brokerage. TraderCat groups thousands of raw fills back into the trades you actually made.",
  },
  {
    Icon: LineChart,
    title: "A chart for every trade",
    body: "Each trade plotted on the underlying's price with your entry, exit, and a running P/L that shows the drawdown you sat through.",
  },
  {
    Icon: MessageSquareText,
    title: "Plain-English AI review",
    body: "The numbers are computed first; the AI only explains them. No invented figures — every review is grounded in your real trade.",
  },
  {
    Icon: BarChart3,
    title: "Analytics that find your edge",
    body: "Win rate, profit factor, payoff ratio, max drawdown, and breakdowns by instrument, direction, day of week and symbol.",
  },
  {
    Icon: Activity,
    title: "Behavioural insights",
    body: "See whether you hold losers longer than winners, tilt after a loss, or lean on a handful of outlier trades.",
  },
  {
    Icon: ShieldCheck,
    title: "Private and secure",
    body: "Your data is scoped to you, brokerage secrets are encrypted at rest, and your journal is never indexed.",
  },
];

const STEPS = [
  { n: "1", title: "Import", body: "Upload a broker CSV or connect your brokerage in a couple of clicks." },
  { n: "2", title: "Review", body: "See every trade rebuilt, charted, and explained in plain English." },
  { n: "3", title: "Improve", body: "Spot the patterns costing you money and fix what actually moves the needle." },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <div className="min-h-screen bg-bg text-ink">
        <header className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-[16px] font-bold text-white">
              T
            </div>
            <span className="text-[16px] font-semibold tracking-tight">{SITE_NAME}</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[14px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90"
            >
              Get started
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-[1100px] px-5">
          {/* Hero */}
          <section className="pb-8 pt-10 text-center lg:pt-20">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft shadow-card">
              Trading journal &amp; AI trade review
            </p>
            <h1 className="mx-auto max-w-[760px] text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-ink lg:text-[54px]">
              The trading journal that explains every trade
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-relaxed text-ink-soft lg:text-[17px]">
              {SITE_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[15px] font-semibold text-white transition-colors hover:bg-ink/90"
              >
                Start your journal <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Sign in
              </Link>
            </div>
          </section>

          {/* Features */}
          <section className="py-14" aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-center text-[24px] font-bold tracking-tight lg:text-[30px]">
              Everything you need to review your trading
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-center text-[14.5px] text-ink-soft">
              From raw broker fills to the behavioural patterns behind your P/L.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, body }) => (
                <SurfaceCard key={title} className="p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
                </SurfaceCard>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="py-14" aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-center text-[24px] font-bold tracking-tight lg:text-[30px]">
              How it works
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-[18px] font-bold text-white">
                    {s.n}
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold text-ink">{s.title}</h3>
                  <p className="mx-auto mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-ink-soft">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-14" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-center text-[24px] font-bold tracking-tight lg:text-[30px]">
              Frequently asked questions
            </h2>
            <div className="mx-auto mt-8 max-w-[720px] space-y-3">
              {FAQ.map((f) => (
                <SurfaceCard key={f.q} as="article" className="p-5">
                  <h3 className="text-[15.5px] font-semibold text-ink">{f.q}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{f.a}</p>
                </SurfaceCard>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="pb-20 pt-6">
            <SurfaceCard className="mx-auto max-w-[720px] p-10 text-center">
              <h2 className="text-[24px] font-bold tracking-tight text-ink lg:text-[30px]">
                Start your trading journal today
              </h2>
              <p className="mx-auto mt-3 max-w-[440px] text-[14.5px] text-ink-soft">
                Import your trades and see what your history has been trying to tell you.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[15px] font-semibold text-white transition-colors hover:bg-ink/90"
              >
                Get started free <ArrowRight size={18} />
              </Link>
            </SurfaceCard>
          </section>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-5 py-8 text-[13px] text-ink-faint sm:flex-row">
            <span>
              © {new Date().getFullYear()} {SITE_NAME}
            </span>
            <nav className="flex gap-5">
              <Link href="/login" className="hover:text-ink">Sign in</Link>
              <Link href="/signup" className="hover:text-ink">Get started</Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
