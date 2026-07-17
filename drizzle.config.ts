import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Next.js reads .env.local automatically; drizzle-kit does not.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// DDL runs over the session pooler / direct connection (5432).
// The transaction pooler (6543) can't run migrations reliably.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL) is required. Copy .env.example to .env.local.",
  );
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  // Supabase owns `auth`, `storage`, etc. Only ever manage our own tables.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
} satisfies Config;
