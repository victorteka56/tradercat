import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, FAQ } from "@/lib/seo";

/**
 * llms.txt — the plain-text primer AI crawlers and answer engines read to
 * understand the product (the middleware already whitelists this path).
 * Journal-first, matching the landing's positioning, and rebuilt from the
 * same seo.ts constants so it can't drift from the site copy.
 */
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a trading journal for retail traders. Its core promise: every
trade in your history, explained — not just logged.

## What it does

- Rebuilds clean trades automatically from raw broker fills (CSV import or
  read-only brokerage sync across 20+ brokers including Robinhood, Webull,
  Schwab and Fidelity).
- Charts every trade on the underlying's price with entry, exit, and the
  running P/L — including the drawdown the trader sat through.
- Reviews each trade in plain English. All numbers are computed first; the AI
  only narrates them, so reviews never invent figures.
- An AI coach reads the whole history and surfaces the 2–4 behavioural
  patterns that matter most (hold-time asymmetry, tilt after losses, profit
  concentration, R-multiple expectancy).
- Analytics: equity curve, win rate, profit factor, payoff ratio, max
  drawdown, R-multiple expectancy, time-of-day sessions, overtrading check,
  and performance by the trader's own setup/mistake/emotion tags.

## Pricing

14-day free trial of everything, no card required. Then $19.99/month
(TraderCat Pro). Cancel anytime; data stays exportable either way.

## Privacy

Read-only broker access. Brokerage secrets encrypted at rest. Every query is
scoped to the account (database row-level security). Users can export or
permanently delete all their data from Settings.

## FAQ

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Links

- Home: ${SITE_URL}
- Pricing: ${SITE_URL}/pricing
- Sign up: ${SITE_URL}/signup
- Privacy: ${SITE_URL}/privacy
- Terms: ${SITE_URL}/terms
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
