# TraderCat Agent Guide

This file is the canonical project brief and operating guide for all AI agents and engineers working in this repo. Read it before making changes. If another agent-specific file exists, it should point back here instead of duplicating divergent rules.

## Product Definition

TraderCat is a mobile-first portfolio intelligence app for active investors and swing/intraday-aware traders. It connects brokerage accounts, supports watchlists, shows useful market and premarket context, and uses AI to explain portfolio risk, trade behavior, and stock setups in plain language.

TraderCat should feel calm, premium, analytical, fast, and trustworthy. It should not feel like a casino trading app, meme-stock product, neon terminal, generic SaaS dashboard, or cluttered brokerage clone.

Core promise: see what you own, what you're watching, what changed, and what deserves attention before the market moves.

## Product Boundaries

TraderCat should provide:

- Brokerage-connected portfolio visibility
- Watchlists and market context
- Premarket briefings
- Stock detail pages with charts and analysis
- Portfolio balance and risk assessment
- Trade behavior review
- AI explanations grounded in real account and market data
- Notifications for meaningful changes
- Admin visibility and operational control

TraderCat should not initially provide:

- Order placement
- Real-time trade execution
- Copy trading
- "Buy this now" signals
- Guaranteed predictions
- Social trading feeds
- Complex options analytics in MVP
- Tax reporting in MVP

## Compliance Posture

AI output must be framed as educational analysis, risk review, and decision support, not personalized financial advice. Avoid direct commands like "buy," "sell," or "hold." Prefer phrasing such as "risk to review," "setup context," "possible support area," "watch for confirmation," and "this may be worth reviewing."

Financial trading, investing, and money-management apps are regulated areas and need legal review before public launch. Personal data sharing, including with third-party AI providers, requires clear user permission and disclosure.

## Recommended Stack

Frontend:

- Expo, React Native, TypeScript
- Expo Router
- React Native Web for web/PWA if needed
- Shared UI primitives from day one

Backend:

- Firebase Auth
- Firestore
- Cloud Functions
- Cloud Scheduler
- Secret Manager
- App Check
- Firebase Analytics or custom telemetry
- Crashlytics for native builds
- Stripe for web subscriptions if launching web first
- RevenueCat for native subscriptions if launching iOS/Android

Integrations:

- SnapTrade for brokerage connections
- Twelve Data for stock data, charts, premarket, fundamentals, and possibly news
- AI provider through backend only
- Optional later: AppsFlyer or Branch for paid acquisition attribution

Provider rules:

- SnapTrade user secrets must never be exposed client-side or stored as plaintext in user-readable documents.
- SnapTrade connection portal URLs expire quickly; generate them server-side just in time.
- Twelve Data licensing, exchange delays, redistribution, and commercial usage must be verified before launch.

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
- Green and red only for market movement, never as the whole brand palette
- Amber for risk or attention
- No decorative dots before labels
- No excessive shadows
- No oversized cards inside cards

Typography scale:

- caption: 11
- label: 12
- small body: 13
- body: 14
- large body: 16
- title: 22
- large title: 26
- hero: 32

Use tabular numerals for financial values where possible.

Required UI primitives:

- `AppPillButton`
- `AppIconButton`
- `SurfaceCard`
- `StatusChip`
- `EmptyStateBlock`
- `MetricCard`
- `SymbolRow`
- `HoldingRow`
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
- No one-off font families.
- No arbitrary spacing when the token scale fits.
- No bespoke shadows for "premium."
- Avoid cards inside cards.

## Core App Navigation

Recommended bottom tabs:

- Home: daily market brief, portfolio snapshot, watchlist movers, AI insights, brokerage sync status
- Watchlist: user watchlists, movers, news, premarket changes, add/search symbols
- Portfolio: connected brokerages, holdings, allocation, risk, performance, trade history
- Explore: stock search, symbol detail, market movers, sectors, earnings/events
- Profile: subscription, brokerage connections, data/privacy, notifications, support

## MVP Feature Scope

Auth and onboarding:

- Let users choose their trader/investor style.
- Let users add watchlist symbols.
- Let users connect a brokerage or skip.
- Do not force brokerage connection before value.
- Show a first useful insight quickly.

Brokerage connection:

- Use SnapTrade server-side.
- Create or retrieve the SnapTrade user on the backend.
- Generate the connection portal URL on the backend.
- Poll or receive sync completion.
- Fetch accounts, balances, positions, and activities into normalized Firestore snapshots.
- Allow disconnecting brokerages.
- Show connection health and stale states.
- Log sync attempts and failures.
- Never silently show stale data as fresh.

Watchlists:

- Users can create multiple watchlists, add/remove/reorder symbols, mark favorites, add notes, and see premarket/after-hours movement when available.
- Default watchlists: My Watchlist, Tech, ETFs, Big Movers.
- Watchlist rows/cards should show symbol, company name, last price, change percent, premarket change if available, mini sparkline, and risk/event chip when useful.

Stock detail:

- Header with symbol, company, price, and change
- Chart intervals: 1D, 5D, 1M, 3M, 1Y
- Candlestick or line toggle later
- Volume context
- Premarket/after-hours label when applicable
- Key levels: previous close, day high/low, premarket high/low, support/resistance estimates
- AI analysis card
- News/events
- Add to watchlist
- User notes

AI stock analysis should answer what changed, current trend, important levels, risks to watch, unusual volatility, and whether movement is sector-driven or news-driven. Never say "buy this" or "sell this."

Premarket brief:

- This should be a signature feature.
- Generate after premarket opens and refresh when the user opens the app.
- Include market tone, watchlist movers, portfolio exposure, notable news, earnings/events, risk flags, and symbols to review.

Portfolio intelligence:

- Total value, cash, unrealized P/L, day change
- Allocation by symbol and sector
- Concentration risk and single-position risk
- Cash balance context
- ETF/stock overlap
- Volatility estimate
- Drawdown context
- Correlation clusters
- Exposure to upcoming earnings
- Plain-language AI summary, risk flags, changes since last sync, and questions the user may want to consider

Trade review:

- Import activities from connected accounts.
- Identify trades.
- Include win rate, average winner, average loser, holding time, realized P/L, repeated symbols, sector bias, overtrading signals, revenge-trade patterns if detectable, and position sizing consistency.
- Keep language nonjudgmental.

Alerts and notifications:

- Premarket brief ready
- Watchlist symbol moved unusually
- Portfolio concentration changed
- Brokerage sync failed
- Upcoming earnings on held/watchlist symbols
- Weekly portfolio review ready

Frequency caps:

- Max 1 market brief/day
- Max 2 watchlist movement pushes/day
- Max 1 portfolio insight/day
- Max 1 weekly review/week
- No push storms during market open

Every notification type must have user controls.

## AI Architecture

AI must be backend-only.

Rules:

- No AI provider keys in the client.
- AI receives normalized data, not raw unbounded user records.
- Use strict JSON schemas.
- Validate every AI response.
- Store prompt version, model, input summary, output, token cost, and latency.
- Rate-limit by user and by feature.
- Cache repeated analyses.
- Include disclaimers where appropriate.
- Never hallucinate prices. Prices come only from market data services or stored brokerage snapshots.

AI output categories:

- `portfolio_risk_summary`
- `trade_review`
- `symbol_analysis`
- `premarket_brief`
- `watchlist_summary`
- `notification_candidate`
- `admin_user_support_summary`

AI must not:

- Provide guaranteed returns
- Give direct personalized buy/sell instructions
- Invent holdings
- Invent prices
- Ignore market data timestamps
- Recommend leverage/options unless the feature is explicitly built and legally reviewed

## Pricing Strategy

Start simple and avoid over-tiering early.

Free:

- 1 brokerage connection
- 1 watchlist
- Limited stock detail views
- Basic delayed market data
- 3 AI analyses/month
- Basic portfolio snapshot

Plus, suggested at `$9.99/month` or `$79/year`:

- Up to 3 brokerage connections
- Unlimited watchlists
- Daily premarket brief
- Weekly portfolio analysis
- More stock analysis
- Trade review basics
- Watchlist alerts

Pro, suggested at `$19.99/month` or `$149/year`:

- More brokerage connections
- Advanced portfolio risk
- Full trade behavior review
- More frequent AI analysis
- Advanced alerts
- Export
- Priority sync
- More market/news context

Entitlement rules:

- Entitlements must be server-verified.
- Never unlock Pro from client-only state.
- Store subscription source, status, renewal state, and last verification.
- Paywalls must clearly show what is included and why the user hit the gate.

## Suggested Firestore Model

```txt
Users/{uid}
  profile
  preferences
  subscription
  onboarding
  riskSettings
  notificationSettings
  createdAt
  lastActiveAt

Users/{uid}/BrokerageConnections/{connectionId}
  provider: "snaptrade"
  institutionName
  status
  lastSyncAt
  lastSuccessfulSyncAt
  errorCode
  accountIds
  createdAt

Users/{uid}/BrokerageAccounts/{accountId}
  connectionId
  brokerageAccountId
  name
  type
  currency
  balance
  buyingPower
  lastSyncAt

Users/{uid}/Positions/{positionId}
  accountId
  symbol
  quantity
  marketValue
  averageCost
  unrealizedPnL
  allocationPct
  asOf

Users/{uid}/Activities/{activityId}
  accountId
  type
  symbol
  quantity
  price
  fees
  tradeDate
  settlementDate

Users/{uid}/Watchlists/{watchlistId}
  name
  symbols
  sortOrder
  createdAt
  updatedAt

MarketData/Symbols/{symbol}
  companyName
  exchange
  type
  sector
  updatedAt

MarketData/Snapshots/{symbol_interval_date}
  symbol
  interval
  candles
  provider
  asOf

Users/{uid}/Analyses/{analysisId}
  type
  inputHash
  promptVersion
  model
  output
  cost
  createdAt

Users/{uid}/Notifications/{notificationId}
  type
  title
  body
  route
  sentAt
  openedAt

Admin/AuditLogs/{logId}
  actorUid
  action
  targetType
  targetId
  createdAt
```

Sensitive provider secrets must not live in normal user-readable documents.

## Backend Functions

Core functions:

- `createBrokerageConnectionSession`
- `syncBrokerageConnections`
- `syncBrokerageAccount`
- `disconnectBrokerage`
- `getPortfolioSnapshot`
- `getPortfolioRiskAnalysis`
- `getTradeReview`
- `getSymbolMarketData`
- `getSymbolAnalysis`
- `getPremarketBrief`
- `createWatchlist`
- `updateWatchlist`
- `trackTelemetryEvent`
- `getSubscriptionStatus`
- `createCheckoutSession`
- `handleSubscriptionWebhook`
- `getAdminDashboardSnapshot`
- `listAdminUsers`
- `getAdminUserDetail`
- `updateAdminUserControls`

Scheduled functions:

- Morning market data refresh
- Premarket brief generation
- Brokerage sync refresh
- Stale connection detection
- Weekly portfolio review
- Notification delivery
- Cost/quota monitoring
- Dead-letter retry processor

## Security Requirements

Non-negotiable:

- All brokerage and market API calls go through the backend.
- No SnapTrade keys client-side.
- No Twelve Data keys client-side.
- No AI keys client-side.
- App Check enforced on callable functions.
- Firestore rules deny cross-user access.
- Admin access uses custom claims.
- Admin mutations are audited.
- Rate limits exist on expensive functions.
- Every callable validates input.
- Secrets live in Secret Manager.
- Logs redact tokens, account IDs where possible, emails, and raw brokerage payloads.
- Provide user data export and deletion paths.
- Require explicit consent before brokerage connection and AI portfolio analysis.

## Admin Dashboard

Build admin early.

Dashboard cards:

- DAU / WAU / MAU
- New users
- Brokerage connect started/completed/failed
- Active connected accounts
- Sync success rate
- AI cost today
- Market data API usage
- Subscription MRR
- Trial starts
- Paywall views
- Conversion rate
- Crash/error rate

User detail:

- Profile
- Subscription status
- Connected brokerages
- Last sync
- Watchlists count
- Portfolio snapshot age
- AI usage
- Notification settings
- Recent app activity
- Errors
- Admin notes
- Support actions

Admin controls:

- Grant/revoke subscription override
- Disable user
- Force brokerage resync
- Clear stuck sync state
- Rotate provider user secret if needed
- View recent errors
- Export user data
- Delete user data
- Adjust AI quota
- Send test notification
- Toggle feature flags

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
portfolio_viewed
stock_viewed
chart_interval_changed
premarket_brief_viewed
ai_analysis_started
ai_analysis_completed
ai_analysis_failed
trade_review_viewed
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

Key funnels:

- Install to onboarding complete
- Onboarding complete to first watchlist
- First watchlist to first stock detail
- Brokerage connect started to completed
- Brokerage connected to portfolio analysis viewed
- Paywall viewed to checkout started to subscribed
- Premarket brief viewed to return next day
- AI analysis viewed to subscription conversion

## Notification Copy Direction

Tone should be brief, useful, and not cheesy.

Good examples:

- Premarket brief is ready: Your watchlist has movement worth reviewing before the open.
- A holding moved premarket: NVDA is moving before the open. See the chart and latest context.
- Portfolio review ready: Your weekly portfolio review is ready, including concentration and risk changes.
- Connection needs attention: One brokerage connection needs to be refreshed to keep your portfolio current.

Avoid:

- "Want Papa to help?"
- "AI found a strong match"
- "Use this before it turns"
- Overly cute language
- Pushes that sound incomplete without opening the app

## Release And Compliance Checklist

Before public release:

- Privacy policy covers brokerage data, market data, AI processing, analytics, subscriptions, and deletion.
- Terms include no investment advice disclaimer.
- Brokerage connection consent screen is explicit.
- AI analysis disclaimer is visible but not obnoxious.
- Market data delay/real-time status is visible.
- App Store finance category review completed.
- SnapTrade terms reviewed.
- Twelve Data licensing reviewed.
- Subscription products configured.
- Admin access locked down.
- Data deletion tested.
- Firestore rules tested.
- App Check enforced.
- Rate limits tested.
- AI cost caps tested.
- Crash reporting verified.

## Suggested Build Phases

Phase 0: Foundation

- Repo setup
- Auth
- Design system
- Navigation
- Theme/tokens/fonts
- Telemetry
- Error reporting
- Admin shell
- Firestore rules baseline

Phase 1: Watchlist MVP

- Symbol search
- Watchlists
- Stock detail shell
- Twelve Data backend proxy
- Basic chart
- Basic market cards

Phase 2: Brokerage MVP

- SnapTrade user creation
- Connection portal
- Account sync
- Positions sync
- Portfolio dashboard
- Connection health states

Phase 3: Intelligence MVP

- Portfolio risk analysis
- Symbol AI analysis
- Premarket brief
- AI schemas
- AI cost controls
- Cached analysis

Phase 4: Monetization

- Pricing
- Entitlements
- Paywall
- Checkout
- Subscription webhooks
- Admin subscription controls

Phase 5: Notifications

- Premarket brief push
- Watchlist movement push
- Brokerage connection issue push
- Weekly portfolio review
- Notification settings

Phase 6: Production Hardening

- Admin dashboard complete
- Security review
- Load/cost testing
- Provider failure handling
- Data export/delete
- App store privacy/compliance
- Native builds

## Agent Operating Standard

Any agent working on TraderCat must:

- Read this file first.
- Read the design system before UI work once it exists.
- Use `rg` for searching.
- Use shared primitives before creating screen-local UI.
- Keep financial data server-controlled.
- Never expose provider keys to the client.
- Add tests for business-critical paths, especially subscription entitlement, brokerage sync, AI quota, user data isolation, and admin permissions.
- Run typecheck before reporting done when a codebase exists.
- For reviews, lead with production risks, not style notes.

## First Engineering Milestone

The first real milestone is:

> A user can create an account, add a watchlist, open a stock, see a chart with delayed market context, connect one brokerage through SnapTrade, and see a portfolio snapshot. Admin can see that user, connection status, sync health, and app activity.

Do not start with the AI wizard. Start with trustworthy data, clean UI, and safe account linking. The AI layer becomes powerful only when the data layer is boringly solid.
