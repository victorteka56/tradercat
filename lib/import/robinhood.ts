import { createHash } from "node:crypto";

/**
 * Parser for the Robinhood "Account Activity" CSV export.
 * Columns: Activity Date, Process Date, Settle Date, Instrument, Description,
 *          Trans Code, Quantity, Price, Amount
 *
 * Pure — no DB, no I/O. Produces normalized fills ready to insert.
 */

export interface ParsedFill {
  symbol: string;
  description: string;
  code: string;
  quantity: number;
  price: number | null;
  amount: number;
  executedAt: Date;
  idempotencyKey: string;
  raw: Record<string, string>;
}

export interface ParsedRowError {
  rowNumber: number;
  raw: Record<string, string> | null;
  errorCode: string;
  message: string;
}

export interface ParseResult {
  fills: ParsedFill[];
  errors: ParsedRowError[];
  /** Non-position rows, aggregated. Not trading P/L. */
  activity: {
    deposits: number;
    dividends: number;
    interest: number;
    other: number;
  };
  dateFrom: Date | null;
  dateTo: Date | null;
  totalRows: number;
}

/* ------------------------------- primitives ------------------------------- */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "$1,747.84" -> 1747.84 ; "($500.80)" -> -500.80 */
function money(s: string): number {
  if (!s) return 0;
  const neg = s.includes("(");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

function num(s: string): number {
  const n = parseFloat((s || "").replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/** "3/27/2026" -> Date (UTC midnight). The export has no time of day. */
function parseDate(s: string): Date | null {
  const m = (s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/* --------------------------------- codes ---------------------------------- */

export const OPEN_LONG = new Set(["BTO", "Buy"]);
export const OPEN_SHORT = new Set(["STO"]);
export const CLOSE_LONG = new Set(["STC", "Sell"]);
export const CLOSE_SHORT = new Set(["BTC"]);
/** Expiration / assignment also close a position. */
export const CLOSE_OTHER = new Set(["OEXP", "OASGN"]);

export const POSITION_CODES = new Set([
  ...OPEN_LONG,
  ...OPEN_SHORT,
  ...CLOSE_LONG,
  ...CLOSE_SHORT,
  ...CLOSE_OTHER,
]);

/**
 * Descriptions that mark an automated corporate action rather than a
 * discretionary trade. Robinhood books dividend reinvestments under a "Buy"
 * code, and splits/spin-offs as position rows too — folding them into trades
 * invents phantom cost basis (a reinvested share sold later shows a near-
 * infinite return). We treat them as account activity, never as trades.
 */
const CORP_ACTION_RE =
  /dividend reinvest|reinvestment|\bstock split\b|\breverse split\b|\bspin-?off\b/i;

export function isCorporateAction(description: string): boolean {
  return CORP_ACTION_RE.test(description);
}

const DIVIDEND_CODES = new Set(["CDIV", "MDIV"]);
const INTEREST_CODES = new Set(["DCF", "INT", "MINT", "GOLD"]);
const TRANSFER_CODES = new Set(["ACH", "ACATI"]);

/* -------------------------------- parsing --------------------------------- */

export function parseRobinhoodActivity(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("The file is empty.");

  const header = rows[0].map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("Activity Date");
  const iInstr = col("Instrument");
  const iDesc = col("Description");
  const iCode = col("Trans Code");
  const iQty = col("Quantity");
  const iPrice = col("Price");
  const iAmount = col("Amount");

  if (iCode < 0 || iAmount < 0 || iDate < 0) {
    throw new Error(
      "This doesn't look like a Robinhood account activity export — expected columns 'Activity Date', 'Trans Code' and 'Amount'.",
    );
  }

  const fills: ParsedFill[] = [];
  const errors: ParsedRowError[] = [];
  const activity = { deposits: 0, dividends: 0, interest: 0, other: 0 };
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  /**
   * The export contains genuinely identical rows (e.g. 11 separate 1-contract
   * SPY buys at the same price on the same day). A pure content hash would
   * collapse those into one fill and silently lose real trades — in the sample
   * data that was 1,200 of 8,198 rows. So the key includes an occurrence index
   * within its identical group, which stays stable across re-imports of the
   * same or a superset file.
   */
  const seen = new Map<string, number>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.join("").trim() === "") continue;

    const asObject = (): Record<string, string> =>
      Object.fromEntries(header.map((h, i) => [h, row[i] ?? ""]));

    if (row.length < header.length) {
      errors.push({
        rowNumber: r + 1,
        raw: asObject(),
        errorCode: "malformed_row",
        message: `Expected ${header.length} columns, found ${row.length}.`,
      });
      continue;
    }

    const code = (row[iCode] || "").trim();
    const amount = money(row[iAmount]);
    const executedAt = parseDate((row[iDate] || "").trim());

    if (executedAt) {
      if (!dateFrom || executedAt < dateFrom) dateFrom = executedAt;
      if (!dateTo || executedAt > dateTo) dateTo = executedAt;
    }

    // Corporate actions (dividend reinvestment, splits) are booked under a
    // position code like "Buy" but are not discretionary trades — route them to
    // activity so they never form a trade with phantom cost basis.
    if (isCorporateAction((row[iDesc] || "").trim())) {
      activity.other += amount;
      continue;
    }

    // Non-position rows: aggregate for context, never as trading P/L.
    if (!POSITION_CODES.has(code)) {
      if (TRANSFER_CODES.has(code)) activity.deposits += amount;
      else if (DIVIDEND_CODES.has(code)) activity.dividends += amount;
      else if (INTEREST_CODES.has(code)) activity.interest += amount;
      else activity.other += amount;
      continue;
    }

    if (!executedAt) {
      errors.push({
        rowNumber: r + 1,
        raw: asObject(),
        errorCode: "bad_date",
        message: `Could not read Activity Date "${row[iDate]}".`,
      });
      continue;
    }

    const symbol = (row[iInstr] || "").trim();
    const description = (row[iDesc] || "").trim().replace(/\s+/g, " ");
    const quantity = num(row[iQty]);

    if (!symbol) {
      errors.push({
        rowNumber: r + 1,
        raw: asObject(),
        errorCode: "missing_instrument",
        message: `Row has trade code "${code}" but no instrument.`,
      });
      continue;
    }

    const price = row[iPrice] ? money(row[iPrice]) : null;
    const content = [
      "robinhood",
      symbol,
      description,
      executedAt.toISOString().slice(0, 10),
      code,
      quantity,
      price ?? "",
      amount,
    ].join("|");

    const n = seen.get(content) ?? 0;
    seen.set(content, n + 1);

    fills.push({
      symbol,
      description,
      code,
      quantity,
      price,
      amount,
      executedAt,
      idempotencyKey: createHash("sha256")
        .update(`${content}#${n}`)
        .digest("hex"),
      raw: asObject(),
    });
  }

  return {
    fills,
    errors,
    activity,
    dateFrom,
    dateTo,
    totalRows: rows.length - 1,
  };
}
