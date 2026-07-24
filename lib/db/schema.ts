import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Money and quantity columns are `numeric`, which Drizzle surfaces as `string`.
 * That is deliberate: floats accumulate error when you sum thousands of fills.
 * Do arithmetic in SQL (Postgres numeric is exact) and convert once for display.
 *
 * Supabase owns the `auth` schema. `authUsers` is declared only so we can build
 * real foreign keys to it — drizzle.config.ts filters DDL to the public schema,
 * so drizzle-kit will never try to manage Supabase's auth tables.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

/* ---------------------------------- enums --------------------------------- */

export const tradeDirectionEnum = pgEnum("trade_direction", ["long", "short"]);
export const tradeStatusEnum = pgEnum("trade_status", ["open", "closed"]);
export const tradeKindEnum = pgEnum("trade_kind", ["option", "stock", "other"]);
export const optionTypeEnum = pgEnum("option_type", ["call", "put"]);
/** R-multiple is meaningless without a defined risk basis — see AGENTS.md. */
export const riskSourceEnum = pgEnum("risk_source", ["stop", "manual", "inferred"]);
export const legTypeEnum = pgEnum("leg_type", ["entry", "exit"]);
export const tagKindEnum = pgEnum("tag_kind", ["setup", "mistake", "emotion", "custom"]);
export const importSourceTypeEnum = pgEnum("import_source_type", [
  "robinhood_csv",
  "snaptrade",
  "other_csv",
]);
export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const reconstructionStatusEnum = pgEnum("reconstruction_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);
export const reconstructionTriggerEnum = pgEnum("reconstruction_trigger", [
  "import",
  "sync",
  "manual",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "disabled",
  "error",
]);

/* ------------------------------- brokerage -------------------------------- */

/**
 * SnapTrade credentials, one row per app user.
 *
 * `userSecretEncrypted` is AES-256-GCM ciphertext, never the raw secret —
 * AGENTS.md: provider secrets must never sit in plaintext in a readable row.
 * The SnapTrade userId is our own auth.users id, so the mapping is 1:1.
 */
export const snaptradeUsers = pgTable("snaptrade_users", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  snaptradeUserId: text("snaptrade_user_id").notNull(),
  userSecretEncrypted: text("user_secret_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brokerageConnections = pgTable(
  "brokerage_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("snaptrade"),
    /** SnapTrade brokerage authorization id. */
    authorizationId: text("authorization_id").notNull(),
    institutionName: text("institution_name"),
    status: connectionStatusEnum("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueAuth: uniqueIndex("brokerage_connections_user_auth_key").on(
      t.userId,
      t.authorizationId,
    ),
  }),
);

export const brokerageAccounts = pgTable(
  "brokerage_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => brokerageConnections.id, {
      onDelete: "cascade",
    }),
    /** SnapTrade account id. */
    externalId: text("external_id").notNull(),
    name: text("name"),
    number: text("number"),
    institutionName: text("institution_name"),
    currency: text("currency"),
    /**
     * TOTAL market value of the account — cash plus every holding — exactly as
     * the brokerage reports it. This is NOT spendable cash; adding it to the
     * positions total would count every holding twice.
     */
    balance: numeric("balance", { precision: 20, scale: 2 }),
    /** Settleable cash only. Can be negative on a margin account. */
    cash: numeric("cash", { precision: 20, scale: 2 }),
    /** SnapTrade sync_status.transactions.initial_sync_completed. */
    transactionsSynced: timestamp("transactions_synced_at", { withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueExternal: uniqueIndex("brokerage_accounts_user_external_key").on(
      t.userId,
      t.externalId,
    ),
  }),
);

/** Current holdings. Replaced wholesale on each sync — a snapshot, not a ledger. */
export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => brokerageAccounts.id, { onDelete: "cascade" }),
    /** Stable per-instrument key within an account (mirrors trades.groupKey). */
    positionKey: text("position_key").notNull(),
    symbol: text("symbol").notNull(),
    description: text("description"),
    kind: tradeKindEnum("kind").notNull().default("stock"),
    optionType: optionTypeEnum("option_type"),
    strike: numeric("strike", { precision: 20, scale: 8 }),
    expiry: timestamp("expiry", { withTimezone: true }),
    /**
     * SnapTrade security type code — `cs` common stock, `crypto`, `et` ETF, etc.
     * Drives the asset-class split; `kind` alone can't tell crypto from equity.
     */
    securityType: text("security_type"),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    averageCost: numeric("average_cost", { precision: 20, scale: 8 }),
    lastPrice: numeric("last_price", { precision: 20, scale: 8 }),
    marketValue: numeric("market_value", { precision: 20, scale: 2 }),
    unrealizedPnl: numeric("unrealized_pnl", { precision: 20, scale: 2 }),
    currency: text("currency"),
    asOf: timestamp("as_of", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueKey: uniqueIndex("positions_account_key").on(t.accountId, t.positionKey),
    byUser: index("positions_user_idx").on(t.userId),
  }),
);

/* --------------------------------- AI ------------------------------------- */

/**
 * Cached AI outputs, keyed by a hash of the exact input.
 *
 * The hash is the cost control: identical inputs never re-bill, and it also
 * means a trade's review is regenerated only when its underlying numbers
 * actually change. Store model + tokens per AGENTS.md's AI-accounting rule.
 */
export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("trade_review"),
    inputHash: text("input_hash").notNull(),
    model: text("model").notNull(),
    output: jsonb("output").notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cacheKey: uniqueIndex("ai_analyses_cache_key").on(
      t.userId,
      t.tradeId,
      t.inputHash,
    ),
  }),
);

/* ------------------------------ market data ------------------------------- */

/**
 * Cached OHLC bars, keyed by symbol+interval+timestamp.
 *
 * Not user-scoped: price history is public data, shared across every user, and
 * caching it is what keeps the market-data bill flat. Partitioning can come
 * later if volume demands it (see AGENTS.md).
 */
export const priceCandles = pgTable(
  "price_candles",
  {
    symbol: text("symbol").notNull(),
    /** "1min" | "5min" | "15min" | "1hour" | "1day" */
    interval: text("interval").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    open: numeric("open", { precision: 20, scale: 8 }).notNull(),
    high: numeric("high", { precision: 20, scale: 8 }).notNull(),
    low: numeric("low", { precision: 20, scale: 8 }).notNull(),
    close: numeric("close", { precision: 20, scale: 8 }).notNull(),
    volume: numeric("volume", { precision: 24, scale: 4 }),
    provider: text("provider").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex("price_candles_pk").on(t.symbol, t.interval, t.ts),
  }),
);

/**
 * Cached ticker news, keyed by the underlying symbol and SHARED across every
 * user — AAPL news is identical for everyone holding it, so we fetch once per
 * symbol and serve everyone from here. `demand` (distinct current holders) and
 * `fetchedAt` drive refresh priority; the whole point is minimal upstream calls.
 */
export const symbolNews = pgTable("symbol_news", {
  symbol: text("symbol").primaryKey(),
  /** Normalised articles, newest first. Null until the first fetch. */
  articles: jsonb("articles"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  /** Distinct users currently holding it — refresh priority for a future cron. */
  demand: integer("demand").notNull().default(0),
  error: text("error"),
});

/* -------------------------------- profiles -------------------------------- */

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  traderStyle: text("trader_style"),
  timezone: text("timezone").notNull().default("America/New_York"),
  /** Journal layout preference: "table" or "calendar". */
  journalView: text("journal_view").notNull().default("table"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------- imports -------------------------------- */

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    source: text("source").notNull(),
    sourceType: importSourceTypeEnum("source_type").notNull(),
    status: importStatusEnum("status").notNull().default("pending"),
    rowCount: integer("row_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byUser: index("import_batches_user_idx").on(t.userId, t.createdAt) }),
);

/** Bad rows land here. Never silently drop a row. */
export const importRowErrors = pgTable(
  "import_row_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importBatchId: uuid("import_batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rawRow: jsonb("raw_row"),
    errorCode: text("error_code").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byBatch: index("import_row_errors_batch_idx").on(t.importBatchId) }),
);

/* ---------------------------------- fills --------------------------------- */

export const fills = pgTable(
  "fills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
    /** Where this fill came from: a CSV import or a specific brokerage account. */
    source: importSourceTypeEnum("source").notNull().default("robinhood_csv"),
    accountId: uuid("account_id").references(() => brokerageAccounts.id, {
      onDelete: "cascade",
    }),

    symbol: text("symbol").notNull(),
    description: text("description"),
    /** Broker code as-imported: BTO / STC / STO / BTC / Buy / Sell / OEXP / OASGN. */
    code: text("code").notNull(),

    /**
     * Structured option detail. Brokerage feeds supply these directly, so
     * reconstruction never has to regex a description — the source of two real
     * bugs on the CSV path. Null for stock fills.
     */
    optionType: optionTypeEnum("option_type"),
    strike: numeric("strike", { precision: 20, scale: 8 }),
    expiry: timestamp("expiry", { withTimezone: true }),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    price: numeric("price", { precision: 20, scale: 8 }),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    fees: numeric("fees", { precision: 20, scale: 2 }).notNull().default("0"),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    externalId: text("external_id"),
    /**
     * hash(source, externalId | broker+symbol+ts+qty+price).
     * Unique per user so re-imports and re-syncs never double-insert.
     */
    idempotencyKey: text("idempotency_key").notNull(),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idempotent: uniqueIndex("fills_user_idempotency_key").on(t.userId, t.idempotencyKey),
    byUserSymbol: index("fills_user_symbol_idx").on(t.userId, t.symbol, t.executedAt),
  }),
);

/* ---------------------------- reconstruction runs -------------------------- */

export const reconstructionRuns = pgTable(
  "reconstruction_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
    status: reconstructionStatusEnum("status").notNull().default("pending"),
    trigger: reconstructionTriggerEnum("trigger").notNull(),
    fillsConsidered: integer("fills_considered").notNull().default(0),
    tradesCreated: integer("trades_created").notNull().default(0),
    tradesUpdated: integer("trades_updated").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => ({ byUser: index("reconstruction_runs_user_idx").on(t.userId, t.startedAt) }),
);

/* ---------------------------------- trades -------------------------------- */

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    reconstructionRunId: uuid("reconstruction_run_id").references(
      () => reconstructionRuns.id,
      { onDelete: "set null" },
    ),

    /**
     * Stable natural key for a position within a user.
     *
     * Scoped by origin (`csv:` or `acct:<id>:`) so the same contract traded at
     * two brokers stays two trades instead of colliding into one. Reconstruction
     * upserts on this, so re-syncing preserves trade ids — and any tags/notes
     * hanging off them.
     */
    groupKey: text("group_key").notNull(),

    /** Which account/import these fills came from — drives the broker badge. */
    source: importSourceTypeEnum("source").notNull().default("robinhood_csv"),
    accountId: uuid("account_id").references(() => brokerageAccounts.id, {
      onDelete: "cascade",
    }),

    symbol: text("symbol").notNull(),
    description: text("description"),
    kind: tradeKindEnum("kind").notNull().default("stock"),
    direction: tradeDirectionEnum("direction").notNull(),
    status: tradeStatusEnum("status").notNull().default("open"),

    // option detail (null for stock)
    optionType: optionTypeEnum("option_type"),
    strike: numeric("strike", { precision: 20, scale: 8 }),
    expiry: timestamp("expiry", { withTimezone: true }),

    /**
     * True when the trade is missing its opening fills — the position was opened
     * before the broker feed's history window, so we see only the closing side.
     * Cost basis is unknown, so its P/L is not reliable and it's excluded from
     * totals. Kept and shown (flagged) rather than dropped.
     */
    incomplete: boolean("incomplete").notNull().default(false),

    openedQty: numeric("opened_qty", { precision: 20, scale: 8 }).notNull().default("0"),
    closedQty: numeric("closed_qty", { precision: 20, scale: 8 }).notNull().default("0"),
    avgEntryPrice: numeric("avg_entry_price", { precision: 20, scale: 8 }),
    avgExitPrice: numeric("avg_exit_price", { precision: 20, scale: 8 }),

    entryAt: timestamp("entry_at", { withTimezone: true }),
    exitAt: timestamp("exit_at", { withTimezone: true }),
    holdingSeconds: integer("holding_seconds"),

    cost: numeric("cost", { precision: 20, scale: 2 }).notNull().default("0"),
    proceeds: numeric("proceeds", { precision: 20, scale: 2 }).notNull().default("0"),
    fees: numeric("fees", { precision: 20, scale: 2 }).notNull().default("0"),
    grossPnl: numeric("gross_pnl", { precision: 20, scale: 2 }),
    netPnl: numeric("net_pnl", { precision: 20, scale: 2 }),

    /** Never present an R-multiple whose risk basis is undefined. */
    riskSource: riskSourceEnum("risk_source"),
    initialRiskPerUnit: numeric("initial_risk_per_unit", { precision: 20, scale: 8 }),
    rMultiple: numeric("r_multiple", { precision: 12, scale: 4 }),

    // excursions — computed from intraday candles, never invented by an LLM
    mae: numeric("mae", { precision: 20, scale: 2 }),
    mfe: numeric("mfe", { precision: 20, scale: 2 }),
    capturedPct: numeric("captured_pct", { precision: 6, scale: 2 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex("trades_user_group_key").on(t.userId, t.groupKey),
    byUser: index("trades_user_idx").on(t.userId, t.exitAt),
    byUserSymbol: index("trades_user_symbol_idx").on(t.userId, t.symbol),
    byUserStatus: index("trades_user_status_idx").on(t.userId, t.status),
  }),
);

/** Each entry/exit partial is individually auditable. */
export const tradeLegs = pgTable(
  "trade_legs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    fillId: uuid("fill_id")
      .notNull()
      .references(() => fills.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    legType: legTypeEnum("leg_type").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    price: numeric("price", { precision: 20, scale: 8 }),
    fees: numeric("fees", { precision: 20, scale: 2 }).notNull().default("0"),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    byTrade: index("trade_legs_trade_idx").on(t.tradeId),
    uniqueFill: uniqueIndex("trade_legs_trade_fill_key").on(t.tradeId, t.fillId),
  }),
);

/* ----------------------------- tags and notes ------------------------------ */

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: tagKindEnum("kind").notNull().default("custom"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqueName: uniqueIndex("tags_user_name_key").on(t.userId, t.name) }),
);

export const tradeTags = pgTable(
  "trade_tags",
  {
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: uniqueIndex("trade_tags_pk").on(t.tradeId, t.tagId) }),
);

export const tradeNotes = pgTable(
  "trade_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byTrade: index("trade_notes_trade_idx").on(t.tradeId) }),
);
