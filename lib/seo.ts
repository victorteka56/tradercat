/**
 * One source of truth for SEO — the canonical site URL, names, descriptions and
 * the JSON-LD structured data that both classic search and AI answer engines
 * (Google AI Overviews, etc.) read to understand what TraderCat is.
 *
 * Set NEXT_PUBLIC_SITE_URL to the production origin (e.g. https://tradercat.app)
 * so canonical URLs, sitemap and Open Graph tags resolve to absolute URLs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://tradercat.app"
).replace(/\/$/, "");

export const SITE_NAME = "TraderCat";
export const SITE_TAGLINE = "Trading journal & AI trade review";

export const SITE_DESCRIPTION =
  "TraderCat rebuilds your trades from your broker's data, charts each one against the market, and reviews it in plain English — so you can see what worked, why, and what to fix next.";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is TraderCat?",
    a: "TraderCat is a trading journal that reconstructs your trades from raw broker fills, plots each one on the underlying's price chart, and explains it in plain language. It then turns your history into analytics that reveal your real edge and behavioural leaks.",
  },
  {
    q: "Which brokers does TraderCat support?",
    a: "You can import a CSV export from brokers like Robinhood and Webull, or connect your brokerage directly for automatic syncing. Synced trades include exact execution times, which unlock price charts and drawdown analysis.",
  },
  {
    q: "How does the AI trade review work?",
    a: "TraderCat computes the numbers first — entry and exit, how far price moved for and against you, drawdown and giveback — then the AI narrates those exact figures in plain English. It never invents numbers, so every review is grounded in your real trade.",
  },
  {
    q: "What analytics does TraderCat provide?",
    a: "Equity curve, win rate, profit factor, payoff ratio, max drawdown, and breakdowns by instrument, direction, day of week, hold length and symbol — plus behavioural findings like whether you hold losers longer than winners or tilt after a loss.",
  },
  {
    q: "Is my trading data private?",
    a: "Yes. Every query is scoped to your account, brokerage secrets are encrypted at rest, and your journal is never indexed by search engines. Only you can see your trades.",
  },
  {
    q: "How much does TraderCat cost?",
    a: "TraderCat is free to start — import your trades and explore your journal and analytics at no cost.",
  },
];

/** JSON-LD graph describing the product for search + AI answer engines. */
export function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        applicationCategory: "FinanceApplication",
        applicationSubCategory: "Trading Journal",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        featureList: [
          "Automatic trade reconstruction from broker fills",
          "Brokerage sync and CSV import",
          "Price charts with entry/exit markers and running P/L",
          "Plain-English AI trade review",
          "Behavioural analytics and edge breakdowns",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}
