/**
 * Applies the hand-written SQL in drizzle/sql/*.sql in filename order.
 *
 * drizzle-kit manages tables/columns/indexes. Triggers, functions and RLS
 * policies live here because drizzle-kit does not generate them. Every file
 * must be idempotent so this is safe to re-run.
 *
 * Usage: npm run db:setup
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

// DDL goes over the session pooler / direct connection.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL required. See .env.example.");
  process.exit(1);
}

const dir = join(process.cwd(), "drizzle", "sql");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.log("No SQL files to apply.");
  process.exit(0);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  for (const file of files) {
    process.stdout.write(`applying ${file} … `);
    await sql.unsafe(readFileSync(join(dir, file), "utf8"));
    console.log("ok");
  }
  console.log(`\nApplied ${files.length} file(s).`);
} catch (err) {
  console.error("\nFailed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
