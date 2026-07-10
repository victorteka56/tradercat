# TraderCat Agent Guide

This file is the canonical project brief and operating guide for all AI agents and engineers working in this repo. Read it before making changes. If another agent-specific file exists, it should point back here instead of duplicating divergent rules.

> **Status:** This brief targets a **mobile-first web app** (think Tradezella/Tradervue), not a native app. Earlier drafts assumed React Native + Firebase; that direction is retired. If you find guidance that contradicts the web stack below, this file wins — flag the stale text.

## Product Definition

TraderCat is a **mobile-first web app** for active investors and swing/intraday-aware traders. It has two tightly linked pillars:

1. **Trade journal + AI trade review (primary).** Pull trade activity from connected brokerages (and CSV imports), reconstruct real trades from raw fills, score every trade, and use AI to explain — in plain language — what happened on entry and exit and what could have been better.
2. **Portfolio intelligence (secondary lens).** Connect brokerage accounts, show holdings, allocation, and risk, and explain portfolio exposure and trade behavior.

TraderCat should feel calm, premium, analytical, fast, and trustworthy. It should not feel like a casino trading app, meme-stock product, neon terminal, generic SaaS dashboard, or cluttered brokerage clone.

Core promise: **see what you traded, understand why it worked or didn't, and know what to review before the next trade** — plus see what you own, what you're watching, and what changed.

## Product Boundaries

TraderCat should provide:

- Trade journaling from broker sync and CSV import
- Automatic trade reconstruction from fills/orders
- Per-trade metrics (P/L, R-multiple, holding time, MAE/MFE, fees, slippage)
- AI trade review: entry/exit quality, "left on the table," winner/loser asymmetry, recurring mistakes
- Journal analytics (win rate by setup/symbol/time, expectancy, equity curve, drawdown, R-distribution)
- Tags, setups, notes, and screenshots per trade
- Brokerage-connected portfolio visibility
- Watchlists and market context
- Premarket briefings
- Stock detail pages with charts and analysis
- Portfolio balance and risk assessment
- AI explanations grounded in real account and market data
- Notifications for meaningful changes
- Admin visibility and operational control

TraderCat should not initially provide:

- Order placement or trade execution
- Copy trading or social trading feeds
- "Buy this now" signals or guaranteed predictions
- Real-time tick streaming in MVP
- Complex options analytics in MVP
- Tax reporting in MVP

## Compliance Posture

AI output must be framed as **educational analysis, journaling insight, risk review, and decision support — not personalized financial advice.** Avoid direct commands like "buy," "sell," or "hold." Prefer phrasing such as "risk to review," "setup context," "possible support area," "your exit captured X% of the move," "watch for confirmation," and "this may be worth reviewing."

Financial trading, investing, and money-management apps are regulated areas and need legal review before public launch. Personal data sharing, including with third-party AI providers, requires clear user permission and disclosure.

## Recommended Stack (Web)

Frontend:

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**
- **Mobile-first responsive** design — treat the phone viewport as the primary target, scale up to desktop
- **Tailwind CSS** for tokens/spacing; **shadcn/ui** as the primitive base, domain primitives layered on top
- Shared UI primitives from day one; charts via a lightweight charting lib (e.g. lightweight-charts / Recharts)

Backend:

- **Next.js route handlers / server actions** for request/response API
- **Inngest** for durable, retryable **background jobs and scheduling** — this is the core data pipeline, not an afterthought. It is the **default**; Trigger.dev is a documented migration option, not a parallel choice. Robustness comes from **idempotent, chunked steps** with provider backoff, concurrency limits, dead-letter handling, and observable replay — not from the runner itself.
- **Neon** (serverless Postgres) as the source of truth — scales to zero, branch-per-PR
- **Upstash Redis** for caching market data + AI analyses and for rate limiting
- **Vercel Blob** for object storage (trade screenshots, CSV uploads) — the default for a Vercel-native MVP. Switch to **Cloudflare R2** only if cost or portability later outweighs simplicity.
- **Sentry** for error + performance monitoring
- **Arcjet or Cloudflare** for bot/abuse protection and rate limiting at the edge
- **Stripe** for subscriptions and billing (web-native)

Auth:

- **Clerk** (best DX) or Auth.js / Supabase Auth — server-verified sessions; never trust client state for entitlements

Integrations:

- **SnapTrade** for brokerage connections and trade activity
- **Polygon.io** for US-equity market data and **intraday historical candles** (required for MAE/MFE). Alpaca is an acceptable cheaper alternative; Twelve Data is thinner on intraday history at low tiers.
- **AI provider through backend only**
- Optional later: attribution (e.g. PostHog/Segment) for paid acquisition

Provider rules:

- SnapTrade user secrets must never be exposed client-side or stored as plaintext in user-readable rows.
- SnapTrade connection portal URLs expire quickly; generate them server-side just in time.
- Market data licensing, exchange delays, redistribution, and commercial usage must be verified before launch.
- No SnapTrade, market data, or AI keys in the client — ever.

Time-series note: for MVP, use **partitioned vanilla Postgres + `pg_partman` + aggressive candle caching** — this is sufficient. Caveat on Neon + TimescaleDB: the `timescaledb` extension *installs* on Neon but only the **Apache-2 subset** — **compression and continuous aggregates (the proprietary TSL features) are not available**, and those are exactly the parts you'd want for candle storage. So don't count on "Neon has TimescaleDB." If candle/analytics volume outgrows partitioned Postgres, evaluate — as a deliberate later choice, not a surprise — **Timescale Cloud** (full TimescaleDB) or **ClickHouse** (for analytics), keeping Neon for transactional/journal data.

## Design System Direction

Product feel:

- Calm, premium, data-rich, trustworthy, fast
- Editorial without being decorative
- Analytical without being intimidating

Visual language:

- Neutral backgrounds
- Deep ink text
- Soft card surfaces
- Muted blue/slate for information
- Green and red **only** for market movement / P&L direction, never as the whole brand palette
- Amber for risk or attention
- No decorative dots before labels
- No excessive shadows
- No oversized cards inside cards

Typography scale (px):

- caption: 11
- label: 12
- small body: 13
- body: 14
- large body: 16
- title: 22
- large title: 26
- hero: 32

Use **tabular numerals** for all financial values (prices, P/L, R-multiples).

Required UI primitives (build these before screens):

- `AppPillButton`
- `AppIconButton`
- `SurfaceCard`
- `StatusChip`
- `EmptyStateBlock`
- `MetricCard`
- `SymbolRow`
- `HoldingRow`
- `TradeRow` — one reconstructed trade with symbol, direction, P/L, R, MAE/MFE badges
- `TradeReviewCard` — AI narrative + captured-move meter
- `EquityCurveChart`
- `BrokerageConnectionCard`
- `RiskBadge`
- `ChartPanel`
- `InsightCard`
- `PaywallPlanCard`
- `AdminDataTable`

UI implementation rules:

- Build primitives first, then screens.
- Use shared primitives before creating screen-local UI.
- Do not introduce hardcoded colors, spacing, radii, or fonts without promoting tokens.
- No one-off font families. No arbitrary spacing when the token scale fits. No bespoke shadows for "premium." Avoid cards inside cards.
- Design for the phone width first; desktop is a progressive enhancement, not the base case.

## Core App Navigation

Mobile-first: a bottom tab bar on small viewports, a sidebar on desktop. Same routes either way:

- **Home**: daily brief, portfolio snapshot, recent trades, journal streak, AI insights, sync status
- **Journal**: trade list, filters (setup/symbol/time), per-trade detail + AI review, tags, notes, screenshots
- **Analytics**: win rate, expectancy, equity curve, drawdown, R-distribution, performance by setup/symbol/time
- **Portfolio**: connected brokerages, holdings, allocation, risk, performance
- **Explore / Watchlist**: symbol search, stock detail, movers, watchlists, premarket
- **Profile**: subscription, brokerage connections, data/privacy, notifications, support

## MVP Feature Scope

### Trade journal (primary pillar)

Import:

- Pull trade activity via SnapTrade from connected accounts.
- Support **CSV import** from common platforms (ThinkorSwim, Tradovate, NinjaTrader, TradingView, IBKR, broker CSVs). Journals live or die by import breadth.
- Normalize all sources into a common `fills` shape before reconstruction.
- Track every import as a batch with status and row counts; never silently drop rows.

Trade reconstruction (**the product lives or dies here — get it boringly correct before any AI**):

- Group fills/orders into round-trip **trades** via `trade_legs`, so every entry/exit partial, scale-in, and scale-out is individually auditable.
- Compute per-trade metrics: avg entry/exit, size, gross/net P/L, fees, holding time, win/loss.
- **R-multiple requires a defined risk source** — brokers don't give you initial risk. Record `risk_source` per trade: `stop` (protective stop price × size), `manual` (user-entered risk amount), or `inferred` (fallback heuristic, clearly labeled). Never present an R-multiple whose risk basis is undefined.
- Handle the messy real world explicitly, with tests: **partial exits, scale-ins/outs, shorts, fees/commissions, time zones (store UTC, present in the trader's tz), CSV quirks per platform, duplicate re-imports (idempotency key), and corporate actions (splits/symbol changes)**.
- Ingested fills carry a **unique idempotency key**; bad CSV rows go to `import_row_errors`, never silently dropped.
- Reconstruction runs as an **idempotent Inngest job**, records a `reconstruction_runs` row, and can be safely re-run after any re-sync or re-import.

MAE/MFE ("what could have been better"):

- For each trade, fetch **intraday historical candles** for the symbol over the trade window and compute **Maximum Adverse Excursion** and **Maximum Favorable Excursion**.
- Derive: captured-move %, "left on the table," entry timing vs. local extremes, whether stops/exits were early or late.
- These are computed **deterministically in code** — the LLM never invents these numbers.

Journal UX:

- Tags/setups, mistake tags, emotion tags, freeform notes, and screenshot attachments per trade.
- Trade detail overlays the trade markers on the chart with MAE/MFE bands.

### AI trade review

- Runs per trade (batched) and per period (weekly/monthly pattern review).
- **Compute-then-narrate:** deterministic math produces the numbers and pattern flags; the LLM only writes the narrative over pre-computed values.
- Surfaces: entry/exit quality, captured %, winner/loser asymmetry (cutting winners / holding losers), recurring mistake tags, sizing consistency, time-of-day performance.
- Language stays nonjudgmental and educational. Never "buy/sell this."

### Analytics

- Win rate, expectancy, average winner/loser, profit factor, equity curve, drawdown, R-distribution.
- Breakdowns by setup, symbol, direction, day-of-week, time-of-day, hold duration.
- Precompute heavy aggregates via **materialized views / scheduled rollups** so mobile dashboards stay fast.

### Portfolio intelligence (secondary)

- Total value, cash, unrealized P/L, day change
- Allocation by symbol and sector; concentration and single-position risk
- ETF/stock overlap, volatility estimate, drawdown context, correlation clusters
- Exposure to upcoming earnings
- Plain-language AI risk summary, changes since last sync, questions to consider

### Brokerage connection

- Use SnapTrade server-side. Create/retrieve the SnapTrade user on the backend; generate the portal URL just in time.
- Sync accounts, balances, positions, and activities into normalized Postgres.
- Show connection health and stale states; log sync attempts and failures. Never show stale data as fresh.

### Watchlists & stock detail

- Multiple watchlists; add/remove/reorder; favorites; notes; premarket/after-hours movement when available.
- Stock detail: header (symbol/company/price/change), chart intervals 1D/5D/1M/3M/1Y, volume, premarket/after-hours label, key levels, AI analysis card, news/events, add-to-watchlist, notes.

### Premarket brief (signature)

- Generate after premarket opens; refresh on app open.
- Market tone, watchlist movers, portfolio exposure, notable news, earnings/events, risk flags, symbols to review.

### Alerts and notifications

Types: premarket brief ready; watchlist symbol moved unusually; portfolio concentration changed; brokerage sync failed; upcoming earnings on held/watchlist symbols; weekly journal + portfolio review ready.

Delivery: **web push + email** (no native push). Frequency caps: max 1 market brief/day, max 2 watchlist pushes/day, max 1 portfolio/journal insight/day, max 1 weekly review/week. No push storms at market open. Every type has user controls.

## AI Architecture

AI must be **backend-only**.

Rules:

- No AI provider keys in the client.
- AI receives **normalized, pre-computed data**, not raw unbounded user records.
- **Compute-then-narrate**: all metrics (MAE/MFE, captured %, R, win rate, excursions) are computed deterministically; the LLM writes narrative over those numbers only.
- Use strict JSON schemas. Validate every AI response.
- Store prompt version, model, input hash, output, token cost, and latency.
- Rate-limit by user and by feature. Cache repeated analyses keyed by input hash (e.g. per-trade review keyed by trade content hash).
- **Tiered models**: small model (Haiku / GPT-4o-mini) for intent parsing, routing, pattern flags — target ~$0.003/call. Big model (Sonnet / GPT-4o) only for narrative synthesis and symbol/portfolio generation.
- Blended cost target: **<$0.05 per conversation/analysis P50, <$0.15 P95**, even for heavy traders with thousands of trades (batch + cache aggressively).
- Include disclaimers where appropriate. Never hallucinate prices — prices come only from market data services or stored brokerage snapshots.

AI output categories:

- `trade_review` — per-trade entry/exit analysis
- `journal_period_review` — weekly/monthly pattern review
- `portfolio_risk_summary`
- `symbol_analysis`
- `premarket_brief`
- `watchlist_summary`
- `notification_candidate`
- `admin_user_support_summary`

AI must not: provide guaranteed returns; give direct personalized buy/sell instructions; invent trades, holdings, or prices; ignore market data timestamps; recommend leverage/options unless the feature is explicitly built and legally reviewed.

## Pricing Strategy

Web subscriptions via **Stripe** (no RevenueCat — that was native-only). Start simple; avoid over-tiering early.

Free:

- 1 brokerage connection
- 1 watchlist
- Manual CSV import, limited trade history
- Basic delayed market data
- 3 AI analyses/month
- Basic journal + portfolio snapshot

Plus — suggested `$14.99/month` or `$119/year`:

- Up to 3 brokerage connections
- Unlimited watchlists and full trade history
- AI trade review + weekly journal review
- Daily premarket brief
- Full journal analytics
- Watchlist alerts

Pro — suggested `$29.99/month` or `$229/year`:

- More brokerage connections
- Advanced portfolio risk + full trade behavior review
- More frequent / deeper AI analysis
- Advanced alerts, export, priority sync
- More market/news context

Entitlement rules:

- Entitlements are **server-verified** against Stripe subscription state. Never unlock paid tiers from client-only state.
- Store subscription source, status, renewal state, and last verification.
- Paywalls clearly show what's included and why the user hit the gate.

## Suggested Postgres Model

Relational, because trade reconstruction, excursion math, and journal analytics are all SQL. Sketch (not exhaustive; use migrations):

```sql
users(id, email, created_at, last_active_at)
user_profiles(user_id, display_name, trader_style, timezone, risk_settings jsonb, notification_settings jsonb)
subscriptions(user_id, plan, status, source, current_period_end, last_verified_at,
              stripe_customer_id, stripe_subscription_id)

-- brokerage
brokerage_connections(id, user_id, provider, institution_name, status,
                      last_sync_at, last_successful_sync_at, error_code, created_at)
brokerage_accounts(id, connection_id, user_id, broker_account_id, name, type,
                   currency, balance, buying_power, last_sync_at)

-- journaling core
import_batches(id, user_id, source, source_type /* snaptrade|csv */, status,
               row_count, error_count, created_at)
import_row_errors(id, import_batch_id, row_number, raw_row jsonb, error_code,
                  message, created_at)                     -- never silently drop rows
fills(id, user_id, account_id, import_batch_id, symbol, side, quantity, price,
      fees, executed_at, external_id, idempotency_key /* UNIQUE per user */,
      raw jsonb)                                           -- normalized executions
        -- idempotency_key = hash(source, external_id | broker+account+symbol+ts+qty+price)
        -- so re-imports and re-syncs never double-insert the same execution
reconstruction_runs(id, user_id, account_id, status, trigger /* import|sync|manual */,
                    fills_considered, trades_created, trades_updated,
                    started_at, finished_at, error)        -- auditable, replayable
trades(id, user_id, account_id, symbol, asset_type, direction /* long|short */,
       status /* open|closed */, quantity, avg_entry_price, avg_exit_price,
       entry_at, exit_at, gross_pnl, net_pnl, fees,
       risk_source /* stop|manual|inferred */, initial_risk_per_unit, r_multiple,
       holding_seconds, best_price, worst_price, mae, mfe, captured_pct,
       reconstruction_run_id, created_at, updated_at)
trade_legs(id, trade_id, fill_id, leg_type /* entry|exit */, quantity, price,
           fees, executed_at)                              -- audits partials/scale-in/out
tags(id, user_id, name, kind /* setup|mistake|emotion|custom */)
trade_tags(trade_id, tag_id)
trade_notes(id, trade_id, body, created_at)
trade_attachments(id, trade_id, storage_key, kind /* screenshot|csv */, created_at)

-- portfolio
positions(id, user_id, account_id, symbol, quantity, market_value, average_cost,
          unrealized_pnl, allocation_pct, as_of)

-- market data
symbols(symbol, company_name, exchange, type, sector, updated_at)
price_candles(symbol, interval, ts, open, high, low, close, volume)   -- partitioned

-- watchlists
watchlists(id, user_id, name, sort_order, created_at, updated_at)
watchlist_symbols(watchlist_id, symbol, sort_order, is_favorite, note)

-- AI
ai_analyses(id, user_id, type, subject_type, subject_id, input_hash, prompt_version,
            model, output jsonb, tokens, cost, latency_ms, created_at)

-- notifications + admin
notifications(id, user_id, type, title, body, route, sent_at, opened_at)
admin_audit_logs(id, actor_user_id, action, target_type, target_id, metadata jsonb,
                 created_at)
```

Rules:

- **Tenant isolation is non-negotiable.** Every table holding user data carries `user_id`. Every read/write goes through a **typed data-access layer** that always applies the tenant filter — no ad-hoc queries in route handlers. Choose one enforcement model and make it explicit:
  - **Postgres RLS** — define policies early (from the first migration), keyed on the authenticated user, and treat them as the last line of defense.
  - **App-enforced** — the data layer injects `user_id` on every query; this must be stated explicitly and covered by tests since the DB won't catch a mistake.
  - Either way, ship **tests that prove cross-user reads and writes fail** for every user-scoped table. These are business-critical tests, not optional.
- Sensitive provider secrets (SnapTrade user secrets) live in **Secret Manager / encrypted store**, never in user-readable rows.

## Backend Surface

Request/response (Next.js route handlers / server actions), all input-validated and auth-checked:

- `createBrokerageConnectionSession`, `disconnectBrokerage`
- `getPortfolioSnapshot`, `getPortfolioRiskAnalysis`
- `getJournalTrades`, `getTradeDetail`, `getTradeReview`
- `getJournalAnalytics`
- `uploadImport`, `getImportStatus`
- `getSymbolMarketData`, `getSymbolAnalysis`, `getPremarketBrief`
- `createWatchlist`, `updateWatchlist`
- `getSubscriptionStatus`, `createCheckoutSession`, `handleStripeWebhook`
- `getAdminDashboardSnapshot`, `listAdminUsers`, `getAdminUserDetail`, `updateAdminUserControls`
- `trackTelemetryEvent`

Background jobs (Inngest / Trigger.dev) — the data pipeline:

- `syncBrokerageConnection` → normalize activities into `fills`
- `reconstructTrades` (idempotent) → build `trades` from `fills`
- `computeExcursions` → fetch intraday candles, compute MAE/MFE per trade
- `generateTradeReview` (batched AI) and `generatePeriodReview`
- `generatePremarketBrief`, `weeklyReview`
- `refreshMarketData`, `detectStaleConnections`
- `deliverNotifications`, `monitorCostQuota`, `deadLetterRetry`

## Security Requirements

Non-negotiable:

- All brokerage, market data, and AI calls go through the backend. No provider keys client-side.
- Sessions are server-verified; entitlements verified against Stripe state, never client claims.
- Every callable/route validates input; expensive routes are rate-limited (Upstash + Arcjet/Cloudflare).
- Row-level user isolation enforced in the data layer (or RLS). Admin access uses a verified admin role/claim; admin mutations are audited.
- Secrets live in a managed secret store. Logs redact tokens, account IDs where possible, emails, and raw brokerage payloads.
- Provide user data export and deletion paths.
- Require explicit consent before brokerage connection and AI analysis of account/trade data.

## Admin Dashboard

Build admin early (it's a Next.js surface too — good candidate for the same Vercel app under an admin route with role gating).

Dashboard cards: DAU/WAU/MAU; new users; brokerage connect started/completed/failed; active connected accounts; sync success rate; trades imported/reconstructed today; AI cost today; market data API usage; Stripe MRR; trial starts; paywall views; conversion rate; crash/error rate.

User detail: profile; subscription status; connected brokerages; last sync; trade/journal counts; portfolio snapshot age; AI usage; notification settings; recent activity; errors; admin notes; support actions.

Admin controls: grant/revoke subscription override; disable user; force resync; clear stuck sync; reprocess import; rotate provider secret; view errors; export/delete user data; adjust AI quota; send test notification; toggle feature flags.

## Analytics Plan

Events:

```txt
app_opened
signup_started
signup_completed
onboarding_started
onboarding_completed
watchlist_created
watchlist_symbol_added
brokerage_connect_started
brokerage_connect_completed
brokerage_connect_failed
brokerage_sync_completed
brokerage_sync_failed
import_started
import_completed
import_failed
trades_reconstructed
journal_viewed
trade_detail_viewed
trade_review_viewed
journal_analytics_viewed
portfolio_viewed
stock_viewed
chart_interval_changed
premarket_brief_viewed
ai_analysis_started
ai_analysis_completed
ai_analysis_failed
paywall_viewed
paywall_cta_tapped
checkout_started
subscription_started
subscription_renewed
subscription_cancelled
notification_received
notification_opened
settings_notification_changed
```

Key funnels: install → onboarding complete; onboarding → first import/connection; first import → trades reconstructed → trade review viewed; brokerage connect started → completed; connected → portfolio analysis viewed; paywall viewed → checkout → subscribed; premarket brief viewed → return next day; trade review viewed → subscription conversion.

## Notification Copy Direction

Brief, useful, not cheesy.

Good:

- Your weekly journal review is ready — including your winner/loser patterns and setups to watch.
- New trades imported — 6 trades reconstructed from your last sync are ready to review.
- Premarket brief is ready — your watchlist has movement worth reviewing before the open.
- One brokerage connection needs to be refreshed to keep your journal current.

Avoid: "Want Papa to help?" / "AI found a strong match" / "Use this before it turns" / overly cute language / pushes that sound incomplete without opening the app.

## Release And Compliance Checklist

Before public release: privacy policy covers brokerage data, market data, AI processing, analytics, subscriptions, deletion; terms include a no-investment-advice disclaimer; brokerage consent screen is explicit; AI disclaimer visible but not obnoxious; market data delay/real-time status visible; SnapTrade + market data licensing reviewed; Stripe products configured; admin access locked down; data deletion tested; user isolation (RLS/tenant filter) tested; rate limits tested; AI cost caps tested; error reporting verified.

## Suggested Build Phases

- **Phase 0 — Foundation:** repo, Next.js + Vercel, auth, design system + tokens, navigation, Neon schema baseline + migrations, telemetry, Sentry, admin shell, Inngest wired.
- **Phase 1 — Journal MVP:** CSV import → normalize → reconstruct trades → per-trade metrics → journal list + trade detail. This is the beating heart; ship it first.
- **Phase 2 — Excursions + AI review:** intraday candle fetch, MAE/MFE, compute-then-narrate trade review, analytics dashboards.
- **Phase 3 — Brokerage sync:** SnapTrade user creation, portal, account/position/activity sync feeding the same journal pipeline; connection health.
- **Phase 4 — Portfolio + market:** portfolio dashboard, watchlists, stock detail, premarket brief, symbol AI.
- **Phase 5 — Monetization:** Stripe pricing, entitlements, paywall, checkout, webhooks, admin subscription controls.
- **Phase 6 — Notifications + hardening:** web push + email, notification settings, admin dashboard complete, security review, cost/load testing, provider failure handling, data export/delete, compliance.

## Agent Operating Standard

Any agent working on TraderCat must:

- Read this file first; read the design system before UI work once it exists.
- Use `rg` for searching.
- Use shared primitives before creating screen-local UI.
- Keep financial data server-controlled; never expose provider keys to the client.
- Keep AI **compute-then-narrate** — never let the model produce the numbers.
- Add tests for business-critical paths: **trade reconstruction, MAE/MFE math, subscription entitlement, brokerage sync, AI quota, user data isolation, admin permissions.**
- Run `tsc`/typecheck and lint before reporting done when a codebase exists.
- For reviews, lead with production risks, not style notes.

## First Engineering Milestone

> A user can sign up, import trades via CSV (or connect one brokerage through SnapTrade), have those fills reconstructed into real trades with P/L and R-multiple, open a trade to see MAE/MFE and an AI review of the entry/exit, and see journal analytics (win rate, expectancy, equity curve). Admin can see that user, import/sync health, trade counts, and app activity.

Start with the **journal data layer** — trustworthy import, correct reconstruction, correct excursion math — before the AI narrative and before portfolio breadth. The AI layer becomes powerful only when the trade data underneath it is boringly correct.
